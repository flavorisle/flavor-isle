import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { squarePhoneApi } from '../../shared/squarePhoneApi.ts';
import { squareCheckoutTotals, settleSquareCheckoutOrder, settleSquareGroupShares } from '../../shared/squareCheckoutSettlement.ts';
import { sendMerchConfirmationEmail } from '../../shared/sendMerchEmails.ts';

// Settles an order paid on a Square hosted secure page (issue #95).
//
// Reached two ways: the browser calls it when Square sends the customer back to
// flavor-isle.com, and the Auto-Sync Orders to Square sweep calls it every few
// minutes as the safety net when a customer never comes back. Nothing settles on
// a customer's word — Square has to report a completed payment for the exact
// total we saved, or the order stays pending.
//
// Idempotent: an order that is already paid returns immediately, and the push to
// Square + the kitchen has its own per-action dedupe, so the browser and the
// sweep can both call this for the same order.

// Tasty Threads merch paid on the secure page: verify the payment, then fulfill
// exactly as the card path does — mark paid, confirm to the customer, and hand
// the order to Printful.
async function settleSquareMerchOrder(base44: any, merchOrder: any) {
  if (!merchOrder.square_checkout_order_id) return { ok: false, reason: 'no secure payment page on this order' };
  if (merchOrder.payment_status === 'paid') return { ok: true, already_paid: true };
  const api = await squarePhoneApi(base44);
  const totals = await squareCheckoutTotals(api, merchOrder.square_checkout_order_id);
  if (!totals.paid) return { ok: false, reason: 'payment not completed yet' };
  const expectedCents = Math.round(Number(merchOrder.total) * 100);
  if (totals.foodCents !== expectedCents) {
    console.error(`Merch order ${merchOrder.order_number} paid ${totals.foodCents}c but should be ${expectedCents}c — not fulfilling`);
    return { ok: false, reason: 'payment does not match the order total' };
  }
  await base44.asServiceRole.entities.MerchOrder.update(merchOrder.id, {
    payment_status: 'paid',
    fulfillment_status: 'paid',
  });
  console.log(`Merch order ${merchOrder.order_number} marked paid`);
  try {
    await sendMerchConfirmationEmail({ ...merchOrder, payment_status: 'paid' });
  } catch (mailErr) {
    console.error('Merch confirmation email failed:', (mailErr as Error).message);
  }
  try {
    await base44.asServiceRole.functions.invoke('createPrintfulOrder', { merchOrderId: merchOrder.id });
    console.log(`Printful order placed for merch order ${merchOrder.order_number}`);
  } catch (pfErr) {
    console.error('Printful order placement failed:', (pfErr as Error).message);
  }
  return { ok: true, settled: true };
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const orderNumber = String(body?.order_number || '').trim();
    if (!orderNumber) return Response.json({ error: 'order_number is required' }, { status: 400 });

    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber });
    const order = orders?.[0];

    if (!order) {
      // Tasty Threads merch orders live in their own table.
      const merchOrders = await base44.asServiceRole.entities.MerchOrder.filter({ order_number: orderNumber });
      const merchOrder = merchOrders?.[0];
      if (!merchOrder) return Response.json({ ok: false, settled: false, reason: 'order not found' }, { status: 404 });
      if (merchOrder.payment_provider !== 'square') {
        return Response.json({ ok: false, settled: false, reason: 'this order does not pay through the secure payment page' });
      }
      const result = await settleSquareMerchOrder(base44, merchOrder);
      return Response.json({ ...result, order_number: orderNumber });
    }

    if (order.payment_provider !== 'square') {
      return Response.json({ ok: false, settled: false, reason: 'this order does not pay through the secure payment page' });
    }
    if (order.pay_cash_on_pickup) {
      return Response.json({ ok: false, settled: false, reason: 'cash is collected and recorded by staff at pickup' });
    }

    // Group / split orders: every person's own shared page must be paid at their
    // exact share before the parent order settles.
    if (order.stripe_session_id === 'GROUP') {
      const result = await settleSquareGroupShares(base44, order);
      if (!result.ok) {
        return Response.json({
          ok: false,
          settled: false,
          partial: !!result.partial,
          reason: result.reason || 'Not every share has been paid yet.',
          shares: result.shares,
        });
      }
      return Response.json({ ok: true, settled: true, group: true, order_number: orderNumber });
    }

    if (order.payment_status === 'paid') {
      return Response.json({ ok: true, settled: true, already_paid: true, order_number: orderNumber });
    }
    if (!order.square_checkout_order_id) {
      return Response.json({ ok: false, settled: false, reason: 'no secure payment page on this order' });
    }

    const paidOrder = await settleSquareCheckoutOrder(base44, order);
    if (paidOrder?.payment_status !== 'paid') {
      return Response.json({ ok: false, settled: false, reason: 'payment not completed yet', order_number: orderNumber });
    }
    return Response.json({ ok: true, settled: true, order_number: orderNumber, total: paidOrder.total, tip: paidOrder.tip });
  } catch (error) {
    console.error('settleSquareWebPayment error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}