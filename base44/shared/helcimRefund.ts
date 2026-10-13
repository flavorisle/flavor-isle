import { helcimPaymentsForInvoice, helcimPaymentByTransaction, refundHelcimTransaction } from './helcimCheckout.ts';

// Refunds for orders paid through the Helcim secure page (issue #97, Part B
// step 12). Mirrors shared/squareRefund.ts: Helcim reports what was actually
// taken, and that is what goes back — nothing here invents a ledger.
//
// Used by refundOrder and cancelOrder for orders whose payment_provider is
// helcim. Stripe-paid and historical orders keep their own Stripe refund path.
export async function refundHelcimOrderPayments(base44: any, order: any) {
  const expectedCents = Math.round(Number(order?.total) * 100);

  // Prefer the transaction recorded at settlement; fall back to the order's own
  // invoice so an order settled by the sweeper can still be refunded.
  let transaction: any = null;
  if (order?.helcim_transaction_id) {
    transaction = await helcimPaymentByTransaction(order.helcim_transaction_id);
  }
  if (!transaction?.transactionId) {
    const payments = await helcimPaymentsForInvoice(order.id);
    transaction = payments.find((payment: any) => payment.amountCents === expectedCents) || payments[0] || null;
  }
  if (!transaction?.transactionId) throw new Error('Helcim has no payment recorded against this order');

  const refund = await refundHelcimTransaction(
    transaction.transactionId,
    transaction.amountCents || expectedCents,
    `refund-${order.id}`,
  );

  return {
    refundedCents: refund.refundedCents || transaction.amountCents || expectedCents,
    refunded: (refund.refundedCents || transaction.amountCents || expectedCents) / 100,
    refundId: refund.refundId || null,
  };
}