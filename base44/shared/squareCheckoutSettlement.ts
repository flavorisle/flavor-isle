import { squarePhoneApi } from './squarePhoneApi.ts';
import { pushOrderToSquareAndKitchen } from './fulfillOrder.ts';

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