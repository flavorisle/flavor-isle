import { squarePhoneApi } from './squarePhoneApi.ts';

// Refunds an order that was paid through a Square hosted checkout, using the
// same connector authorization the phone payment path uses — no separate
// credentials, and nothing here invents a ledger: Square reports what was
// actually taken, and that is what goes back.
//
// Used by refundOrder and cancelOrder for orders whose payment_provider is
// square. Stripe-paid and historical orders keep their own Stripe refund path.
export async function refundSquareOrderPayments(base44: any, order: any) {
  const squareOrderId = order?.square_checkout_order_id || order?.square_order_id;
  if (!squareOrderId) throw new Error('No Square order found on this order');

  const api = await squarePhoneApi(base44);
  const squareOrder = (await api.request(`orders/${squareOrderId}`)).order;
  const paymentIds = (squareOrder?.tenders || []).map((tender: any) => tender.payment_id).filter(Boolean);
  if (paymentIds.length === 0) throw new Error('Square has no payment recorded against this order');

  let refundedCents = 0;
  let lastRefundId: string | null = null;
  for (const paymentId of paymentIds) {
    const payment = (await api.request(`payments/${paymentId}`)).payment;
    if (payment?.status !== 'COMPLETED') continue;
    const remaining = Number(payment.total_money?.amount || 0) - Number(payment.refunded_money?.amount || 0);
    if (remaining <= 0) continue;
    const refund = await api.request('refunds', 'POST', {
      // One refund per payment per order: a retry of the same cancellation can
      // never send the money back twice.
      idempotency_key: `refund-${order.id}-${paymentId}`,
      payment_id: paymentId,
      amount_money: { amount: remaining, currency: 'USD' },
      reason: 'Order refunded by Flavor Isle',
    });
    lastRefundId = refund?.refund?.id || lastRefundId;
    refundedCents += remaining;
  }

  if (refundedCents <= 0) throw new Error('Square reports nothing left to refund on this order');
  return { refundedCents, refunded: refundedCents / 100, refundId: lastRefundId };
}

// One line item's exact amount back, on the payment that paid this order
// (issue #116, Part F). Same connector authorization as the full refund above;
// the difference is the amount — this never refunds more than Square still
// holds on that payment.
export async function refundSquareOrderItem(base44: any, order: any, amount: number, paymentId?: string | null) {
  const squareOrderId = order?.square_checkout_order_id || order?.square_order_id;
  if (!squareOrderId) throw new Error('No Square order found on this order');

  const api = await squarePhoneApi(base44);

  let targetPaymentId = String(paymentId || '').trim();
  if (!targetPaymentId) {
    const squareOrder = (await api.request(`orders/${squareOrderId}`)).order;
    targetPaymentId = (squareOrder?.tenders || []).map((tender: any) => tender.payment_id).filter(Boolean)[0] || '';
  }
  if (!targetPaymentId) throw new Error('Square has no payment recorded against this order');

  const payment = (await api.request(`payments/${targetPaymentId}`)).payment;
  if (payment?.status !== 'COMPLETED') throw new Error('That Square payment is not completed, so it cannot be refunded');

  const refundableCents = Number(payment.total_money?.amount || 0) - Number(payment.refunded_money?.amount || 0);
  const cents = Math.round(Number(amount) * 100);
  if (!(cents > 0)) throw new Error('There is nothing to refund on this item');
  if (cents > refundableCents) {
    throw new Error(`Square only has $${(refundableCents / 100).toFixed(2)} left to refund on this payment`);
  }

  const refund = await api.request('refunds', 'POST', {
    idempotency_key: `item-refund-${order.id}-${targetPaymentId}-${cents}`,
    payment_id: targetPaymentId,
    amount_money: { amount: cents, currency: 'USD' },
    reason: 'Item refunded by Flavor Isle',
  });

  return { ok: true, refund_id: refund?.refund?.id || null, refunded: cents / 100 };
}