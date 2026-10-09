import { squarePhoneApi } from './squarePhoneApi.ts';

export async function settleCashPickupPayment(base44, order, recordCash = false, suppliedSquareOrder = null) {
  if (!order.pay_cash_on_pickup || order.payment_status === 'paid' || !order.square_order_id) return order;
  const api = await squarePhoneApi(base44);
  const squareOrder = suppliedSquareOrder || (await api.request(`orders/${order.square_order_id}`)).order;
  const expected = Math.round(Number(order.total) * 100);
  if (!Number.isSafeInteger(expected) || expected <= 0) throw new Error('Invalid cash order total.');
  const ids = (squareOrder.tenders || []).map(t => t.payment_id).filter(Boolean);
  let payments = await Promise.all(ids.map(async id => (await api.request(`payments/${id}`)).payment));
  const verified = payment => payment.status === 'COMPLETED' && payment.order_id === order.square_order_id && payment.total_money?.currency === 'USD';
  let received = payments.filter(verified).reduce((sum, p) => sum + Number(p.total_money.amount) - Number(p.refunded_money?.amount || 0), 0);
  if (received !== expected && recordCash) {
    if (received > 0 || Number(squareOrder.net_amount_due_money?.amount) !== expected) throw new Error('Square has a different balance or a partial payment. Finish payment on the register.');
    const { payment } = await api.request('payments', 'POST', {
      idempotency_key: `cash-pickup-${order.id}`, source_id: 'CASH',
      order_id: order.square_order_id, location_id: squareOrder.location_id,
      amount_money: { amount: expected, currency: 'USD' },
      cash_details: { buyer_supplied_money: { amount: expected, currency: 'USD' } },
    });
    if (!verified(payment) || Number(payment.total_money.amount) !== expected) throw new Error('Square did not confirm the full cash payment.');
    payments = [payment]; received = expected;
  }
  if (received !== expected) return order;
  const cash = payments.find(p => verified(p) && p.source_type === 'CASH');
  const updates = { payment_status: 'paid', manual_pay_required: false, ...(cash ? { cash_payment_id: cash.id } : {}) };
  await base44.asServiceRole.entities.Order.update(order.id, updates);
  // A cash order often completes before the crew collects the money, and the
  // profile-stats sync only counts paid orders — so re-run it once cash lands
  // or the customer's order history would silently miss this visit.
  if (order.status === 'completed') {
    try {
      await base44.functions.invoke('syncCustomerProfileStats', { order_id: order.id });
    } catch (syncErr) {
      console.warn(`Profile sync after cash payment failed for order ${order.order_number}:`, syncErr.message);
    }
  }
  return { ...order, ...updates };
}