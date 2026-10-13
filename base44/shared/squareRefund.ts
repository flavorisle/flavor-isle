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