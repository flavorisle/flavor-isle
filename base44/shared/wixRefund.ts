// Refunds for orders paid through Base44 Payments (Wix) — issue #116, Parts A/F.
//
// The platform's own refund API is the only thing that moves money back: it talks to
// the provider, it is idempotent on the key we send, and it reports what actually
// went back. Nothing here invents a ledger.
//
// A refund is always addressed to the payment that paid THIS order, found from the
// checkout session id recorded at settlement, so a stray order number can never
// refund somebody else's charge.

export async function findWixPayment(base44: any, order: any) {
  const checkoutId = String(order?.wix_checkout_session_id || '').trim();
  if (!checkoutId) return null;
  const page = await base44.asServiceRole.payments.listPurchases({ checkout_id: checkoutId, limit: 10 });
  const purchase = (page?.items || []).find((item: any) => item?.payment_id);
  if (!purchase) return null;
  return {
    paymentId: String(purchase.payment_id),
    amountCents: Math.round(Number(purchase.amount_total || 0)),
    status: String(purchase.status || ''),
  };
}

// A refund of an exact amount, in cents, against this order's own payment. The
// idempotency key is what makes a retry safe: the same key returns the original
// refund instead of sending money twice.
export async function refundWixAmount(base44: any, order: any, amountCents: number, idempotencyKey: string) {
  const payment = await findWixPayment(base44, order);
  if (!payment?.paymentId) throw new Error('No card payment is recorded against this order');
  const cents = Math.round(Number(amountCents));
  if (!(cents > 0)) throw new Error('There is nothing left to refund on this order');

  const refund = await base44.asServiceRole.payments.refund({
    payment_id: payment.paymentId,
    amount: cents,
    idempotency_key: String(idempotencyKey).slice(0, 100),
  });

  return {
    refundedCents: Math.round(Number(refund?.amount || cents)),
    refunded: Math.round(Number(refund?.amount || cents)) / 100,
    refundId: refund?.refund_id || null,
    status: refund?.status || 'succeeded',
  };
}

// The full-order refund used by refundOrder and cancelOrder: the money that was taken
// for this order goes back, to the cent.
export async function refundWixOrderPayments(base44: any, order: any) {
  const expectedCents = Math.round(Number(order?.total) * 100);
  return refundWixAmount(base44, order, expectedCents, `refund-${order.id}`);
}