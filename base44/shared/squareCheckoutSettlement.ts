import { squarePhoneApi } from './squarePhoneApi.ts';
import { pushOrderToSquareAndKitchen } from './fulfillOrder.ts';
import { settleGroupOrderIfComplete } from './groupPaymentSettlement.ts';

// Settlement for orders paid through a Square hosted checkout — the phone pay
// link and the website's secure payment page both land here.
//
// Square is the only source of truth for whether the money arrived: an order
// counts as paid only when every tender on that Square order is a COMPLETED USD
// payment against that same order, and only when the food amount (what was paid
// minus any tip the customer added on the secure page) equals the total we
// saved. Anything else leaves the order pending, so an underpayment can never
// turn into a kitchen ticket.
export async function squareCheckoutTotals(api: any, squareOrderId: string, suppliedSquareOrder: any = null) {
  // orders/search results can omit tenders, so a supplied order without them is
  // never trusted as "unpaid" — fetch the full order before deciding.
  let squareOrder = suppliedSquareOrder;
  if (!squareOrder?.tenders?.length) squareOrder = (await api.request(`orders/${squareOrderId}`)).order;
  const paymentIds = (squareOrder?.tenders || []).map((tender: any) => tender.payment_id).filter(Boolean);
  if (paymentIds.length === 0) return { paid: false };
  const payments = await Promise.all(paymentIds.map(async (id: string) => (await api.request(`payments/${id}`)).payment));
  if (payments.some((payment: any) => payment.status !== 'COMPLETED' || payment.order_id !== squareOrderId || payment.total_money?.currency !== 'USD')) {
    return { paid: false };
  }
  const receivedCents = payments.reduce(
    (sum: number, payment: any) => sum + Number(payment.total_money.amount) - Number(payment.refunded_money?.amount || 0),
    0,
  );
  const tipCents = payments.reduce((sum: number, payment: any) => sum + Number(payment.tip_money?.amount || 0), 0);
  return { paid: true, receivedCents, tipCents, foodCents: receivedCents - tipCents };
}

// Marks an order paid and pushes it to Square POS + the kitchen ONCE Square
// confirms the exact total. The Square checkout order already exists and is
// paid, so it becomes the POS ticket (square_order_id) and no second ticket is
// created for it.
export async function settleSquareCheckoutOrder(base44: any, order: any, suppliedSquareOrder: any = null) {
  if (order.payment_provider !== 'square' || !order.square_checkout_order_id || order.payment_status === 'paid') return order;
  const api = await squarePhoneApi(base44);
  const totals = await squareCheckoutTotals(api, order.square_checkout_order_id, suppliedSquareOrder);
  if (!totals.paid) return order;
  const expectedCents = Math.round(Number(order.total) * 100);
  if (totals.foodCents !== expectedCents) {
    throw new Error(`Square payment does not match the order total (expected ${expectedCents}c, paid ${totals.foodCents}c).`);
  }
  const updates = {
    payment_status: 'paid',
    status: order.status === 'pending' ? 'confirmed' : order.status,
    square_order_id: order.square_checkout_order_id,
    tip: totals.tipCents / 100,
    total: totals.receivedCents / 100,
    manual_pay_required: false,
  };
  await base44.asServiceRole.entities.Order.update(order.id, updates);
  const paidOrder = { ...order, ...updates };
  await pushOrderToSquareAndKitchen(base44, paidOrder);
  return paidOrder;
}

// Group / split orders paid through Square: each person gets their own payment
// link, so the parent order settles only when EVERY share is a completed Square
// payment for that person's exact share. A short payment fails its share, and a
// failed share keeps the parent unsettled — the same rule the Stripe split
// shares use.
export async function settleSquareGroupShares(base44: any, order: any) {
  const shares = await base44.asServiceRole.entities.GroupPaymentShare.filter({ order_id: order.id });
  if (!shares || shares.length === 0) {
    return { ok: false, reason: 'no group shares found (cannot verify without payment evidence)' };
  }
  const api = await squarePhoneApi(base44);
  let allSucceeded = true;
  const statuses: any[] = [];
  for (const share of shares) {
    if (!share.square_checkout_order_id) {
      allSucceeded = false;
      statuses.push({ person_name: share.person_name, status: share.status === 'succeeded' ? 'succeeded' : 'pending' });
      continue;
    }
    let totals: any = { paid: false };
    try {
      totals = await squareCheckoutTotals(api, share.square_checkout_order_id);
    } catch (err) {
      console.warn(`Group Square share ${share.square_checkout_order_id} lookup failed:`, (err as Error).message);
      allSucceeded = false;
      statuses.push({ person_name: share.person_name, status: 'unknown' });
      continue;
    }
    if (!totals.paid) {
      allSucceeded = false;
      statuses.push({ person_name: share.person_name, status: share.status === 'succeeded' ? 'succeeded' : 'pending' });
      continue;
    }
    const expectedCents = Math.round((Number(share.expected_amount) || 0) * 100);
    const status = totals.foodCents === expectedCents ? 'succeeded' : 'failed';
    if (status === 'failed') {
      console.error(`Group Square share for ${share.person_name} underpaid: expected ${expectedCents}c, paid ${totals.foodCents}c — marking failed`);
    }
    if (share.status !== status) {
      await base44.asServiceRole.entities.GroupPaymentShare.update(share.id, {
        status,
        settled_at: new Date().toISOString(),
      });
    }
    if (status !== 'succeeded') allSucceeded = false;
    statuses.push({ person_name: share.person_name, status });
  }
  if (!allSucceeded) return { ok: false, partial: true, shares: statuses };
  return { ok: true, shares: statuses, ...(await settleGroupOrderIfComplete(base44, order.id)) };
}