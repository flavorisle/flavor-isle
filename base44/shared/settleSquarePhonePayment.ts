import { squarePhoneApi } from './squarePhoneApi.ts';
import { pushOrderToSquareAndKitchen } from './fulfillOrder.ts';

export async function settleSquarePhonePayment(base44, order, suppliedSquareOrder = null) {
  if (order.payment_provider !== 'square' || !order.square_checkout_order_id || order.payment_status === 'paid') return order;
  const api = await squarePhoneApi(base44);
  // orders/search results can omit tenders, so a supplied order without them is
  // never trusted as "unpaid" — fetch the full order before deciding.
  let squareOrder = suppliedSquareOrder;
  if (!squareOrder?.tenders?.length) squareOrder = (await api.request(`orders/${order.square_checkout_order_id}`)).order;
  const paymentIds = (squareOrder.tenders || []).map(tender => tender.payment_id).filter(Boolean);
  if (!paymentIds.length) return order;
  const payments = await Promise.all(paymentIds.map(async id => (await api.request(`payments/${id}`)).payment));
  if (payments.some(payment => payment.status !== 'COMPLETED' || payment.order_id !== order.square_checkout_order_id || payment.total_money?.currency !== 'USD')) return order;
  const received = payments.reduce((sum, payment) => sum + Number(payment.total_money.amount) - Number(payment.refunded_money?.amount || 0), 0);
  const tipCents = payments.reduce((sum, payment) => sum + Number(payment.tip_money?.amount || 0), 0);
  if (received - tipCents !== Math.round(order.total * 100)) throw new Error('Square payment does not match the phone order total.');
  const updates = {
    payment_status: 'paid', status: order.status === 'pending' ? 'confirmed' : order.status,
    square_order_id: order.square_checkout_order_id, tip: tipCents / 100, total: received / 100, manual_pay_required: false,
  };
  await base44.asServiceRole.entities.Order.update(order.id, updates);
  const paidOrder = { ...order, ...updates };
  // The checkout order is already paid and in Square; never create a second POS ticket.
  await pushOrderToSquareAndKitchen(base44, paidOrder);
  return paidOrder;
}