import { helcimCheckoutTotals } from './helcimCheckout.ts';
import { pushOrderToSquareAndKitchen } from './fulfillOrder.ts';

// Settlement for orders paid through the Helcim secure page (issue #97, Part B
// step 9). Mirrors shared/squareCheckoutSettlement.ts exactly.
//
// Helcim is the only source of truth for whether the money arrived: an order is
// paid only when Helcim reports an APPROVED USD payment for the exact total we
// saved, matched back to this order by its own invoice number (the order id).
// A short payment, a second payment, or a payment we cannot read leaves the
// order pending — it never becomes a kitchen ticket on anything but exact money.
export async function settleHelcimCheckoutOrder(base44: any, order: any, suppliedTransactionId?: string) {
  if (order.payment_provider !== 'helcim' || order.payment_status === 'paid') return order;

  const expectedCents = Math.round(Number(order.total) * 100);
  const totals = await helcimCheckoutTotals(order.id, expectedCents, suppliedTransactionId);
  if (!totals.paid) return order;

  if (totals.foodCents !== expectedCents) {
    throw new Error(
      `Helcim payment does not match the order total (expected ${expectedCents}c, paid ${totals.foodCents}c).`,
    );
  }

  const updates = {
    payment_status: 'paid',
    status: order.status === 'pending' ? 'confirmed' : order.status,
    tip: totals.tipCents / 100,
    total: totals.receivedCents / 100,
    helcim_transaction_id: totals.transactionId || order.helcim_transaction_id || '',
    manual_pay_required: false,
  };
  await base44.asServiceRole.entities.Order.update(order.id, updates);

  // The Square POS ticket and the kitchen push are unchanged by this build: a
  // Helcim-paid order enters the same fulfilment path every other order uses.
  const paidOrder = { ...order, ...updates };
  await pushOrderToSquareAndKitchen(base44, paidOrder);
  return paidOrder;
}

// Tasty Threads merch paid on a Helcim secure page: verify the payment to the
// cent, then fulfil exactly as the card path does. Printful is only asked to
// produce anything once the money is confirmed.
export async function settleHelcimMerchOrder(base44: any, merchOrder: any, suppliedTransactionId?: string) {
  if (!merchOrder.helcim_checkout_id && !suppliedTransactionId) {
    return { ok: false, reason: 'no Helcim secure payment page on this order' };
  }
  if (merchOrder.payment_status === 'paid') return { ok: true, already_paid: true };

  const expectedCents = Math.round(Number(merchOrder.total) * 100);
  const totals = await helcimCheckoutTotals(merchOrder.id, expectedCents, suppliedTransactionId);
  if (!totals.paid) return { ok: false, reason: 'payment not completed yet' };
  if (totals.foodCents !== expectedCents) {
    console.error(
      `Merch order ${merchOrder.order_number} paid ${totals.foodCents}c but should be ${expectedCents}c — not fulfilling`,
    );
    return { ok: false, reason: 'payment does not match the order total' };
  }

  await base44.asServiceRole.entities.MerchOrder.update(merchOrder.id, {
    payment_status: 'paid',
    fulfillment_status: 'paid',
    helcim_transaction_id: totals.transactionId || merchOrder.helcim_transaction_id || '',
  });
  console.log(`Merch order ${merchOrder.order_number} marked paid (Helcim)`);

  try {
    const { sendMerchConfirmationEmail } = await import('./sendMerchEmails.ts');
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