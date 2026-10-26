import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { squareWebConfig, chargeSquareToken } from '../../shared/squareWebPay.ts';
import { verifyPhoneOrderTip } from '../../shared/phonePay.ts';
import { pushOrderToSquareAndKitchen } from '../../shared/fulfillOrder.ts';
import { markMerchPaidAndFulfill } from '../../shared/merchSettlement.ts';

// The one place our own card form turns a token into money.
//
// The browser sends the single-use token Square's form produced and nothing else
// that matters: the amount is read from the ORDER RECORD, never from the request,
// so a tampered page cannot charge a different total. For a phone order the tip
// is rebuilt here from the stored subtotal + tax + delivery fee — again never
// taken from the browser. Square must answer with a completed USD payment of
// exactly that amount before the order is marked paid and handed to Square POS,
// the kitchen printer, and the customer.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const orderNumber = String(body?.order_number || '').trim().toUpperCase();
    const sourceId = String(body?.source_id || '').trim();
    if (!orderNumber || !sourceId) {
      return Response.json({ error: 'order_number and source_id are required' }, { status: 400 });
    }

    const config = await squareWebConfig(base44);
    if (!config.configured) {
      return Response.json({ error: config.reason || 'Card payment is unavailable right now.' }, { status: 503 });
    }

    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber });
    const order = (orders || []).find(o => o.payment_url || o.manual_pay_required || o.payment_provider);
    if (order) return Response.json(await payFoodOrder(base44, order, sourceId, body?.tip));

    const merchOrders = await base44.asServiceRole.entities.MerchOrder.filter({ order_number: orderNumber });
    const merch = (merchOrders || [])[0];
    if (merch) return Response.json(await payMerchOrder(base44, merch, sourceId));

    return Response.json({ error: 'We could not find that order.' }, { status: 404 });
  } catch (error) {
    console.error('paySquareOrder error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function payFoodOrder(base44: any, order: any, sourceId: string, rawTip: unknown) {
  if (order.payment_status === 'paid') {
    return { settled: true, already_paid: true, order_number: order.order_number, kind: 'food' };
  }
  if (order.status === 'cancelled' || order.payment_status === 'refunded') {
    return { error: 'This order is closed, so it cannot be paid.', closed: true };
  }
  if (order.pay_cash_on_pickup) {
    return { error: 'This order is paid in cash at the counter.', closed: true };
  }
  // Never charge an order that already has its own open card form or a different
  // processor behind it — that would be a second charge for the same food.
  if (
    order.square_payment_link_id ||
    (order.payment_provider && order.payment_provider !== 'square')
  ) {
    return { error: 'This order pays on its own card page. Please use the link you were sent, or call us at (270) 563-4618.' };
  }

  // The tip is optional on this page (checkout orders already carry theirs).
  // When one is sent it is verified and priced here, against the stored order.
  let tip = Number(order.tip) || 0;
  let total = Number(order.total) || 0;
  if (rawTip !== undefined && rawTip !== null && Number(rawTip) !== 0) {
    const verified = verifyPhoneOrderTip(order, rawTip);
    if (!verified.ok) return { error: verified.error };
    tip = verified.tip;
    total = verified.total;
  }

  const amountCents = Math.round(total * 100);
  if (!amountCents || amountCents < 1) return { error: 'This order has no amount to pay.' };

  let payment;
  try {
    payment = await chargeSquareToken(base44, {
      sourceId,
      amountCents,
      idempotencyKey: `pay-square-${order.id}`,
      referenceId: order.order_number,
      note: `Flavor Isle order #${order.order_number}`,
      buyerEmail: order.customer_email && !order.customer_email.endsWith('@flavorisle.com') ? order.customer_email : undefined,
    });
  } catch (chargeErr) {
    console.error(`Square charge failed for order ${order.order_number}:`, (chargeErr as Error).message);
    return { error: (chargeErr as Error).message || 'That card could not be charged. Please check the details and try again.' };
  }

  const paidOrder = {
    ...order,
    tip,
    total,
    payment_status: 'paid',
    status: order.status === 'pending' ? 'confirmed' : order.status,
    manual_pay_required: false,
  };

  try {
    await base44.asServiceRole.entities.Order.update(order.id, {
      payment_status: 'paid',
      status: paidOrder.status,
      payment_provider: 'square',
      tip,
      total,
      manual_pay_required: false,
    });
  } catch (updateErr) {
    // The money is taken, so the order must still reach the kitchen. Log loudly
    // and carry on rather than leaving a paid customer with an unmade order.
    console.error(
      `Square charged ${payment.id} for order ${order.order_number} but the order update failed:`,
      (updateErr as Error).message,
    );
  }

  await pushOrderToSquareAndKitchen(base44, paidOrder);
  return { settled: true, order_number: order.order_number, kind: 'food', total, tip };
}

async function payMerchOrder(base44: any, merch: any, sourceId: string) {
  if (merch.payment_status === 'paid') {
    return { settled: true, already_paid: true, order_number: merch.order_number, kind: 'merch' };
  }
  if (merch.payment_status === 'failed' || merch.fulfillment_status === 'canceled') {
    return { error: 'This order is closed, so it cannot be paid.', closed: true };
  }
  if (merch.payment_provider && merch.payment_provider !== 'square') {
    return { error: 'This order pays on its own card form. Please use the link you were sent.' };
  }

  const amountCents = Math.round((Number(merch.total) || 0) * 100);
  if (!amountCents || amountCents < 1) return { error: 'This order has no amount to pay.' };

  let payment;
  try {
    payment = await chargeSquareToken(base44, {
      sourceId,
      amountCents,
      idempotencyKey: `pay-square-merch-${merch.id}`,
      referenceId: merch.order_number,
      note: `Tasty Threads order ${merch.order_number}`,
      buyerEmail: merch.customer_email || undefined,
    });
  } catch (chargeErr) {
    console.error(`Square charge failed for merch order ${merch.order_number}:`, (chargeErr as Error).message);
    return { error: (chargeErr as Error).message || 'That card could not be charged. Please check the details and try again.' };
  }

  await base44.asServiceRole.entities.MerchOrder.update(merch.id, { payment_provider: 'square' });
  const result = await markMerchPaidAndFulfill(base44, merch);
  return { ...result, order_number: merch.order_number, kind: 'merch', total: merch.total, payment_id: payment.id };
}