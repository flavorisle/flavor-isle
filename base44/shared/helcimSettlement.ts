import { helcimCheckoutTotals } from './helcimCheckout.ts';
import { pushOrderToSquareAndKitchen } from './fulfillOrder.ts';

// Settlement for orders paid through the card secure page (issue #97, Part B
// step 9). Mirrors shared/squareCheckoutSettlement.ts exactly.
//
// The card processor is the only source of truth for whether the money arrived: an
// order is paid only when it reports an APPROVED USD payment for the exact total we
// saved, matched back to this order by its own invoice number (the order id).
// A short payment, a second payment, or a payment we cannot read leaves the
// order pending — it never becomes a kitchen ticket on anything but exact money.
export async function settleHelcimCheckoutOrder(base44: any, order: any, suppliedTransactionId?: string) {
  if (order.payment_provider !== 'helcim' || order.payment_status === 'paid') return order;

  // An order our own card fields took carries the transaction they created, so a later
  // attempt — the confirmation page, the sweeper, an admin retry — verifies the same
  // payment even when the browser's own POST never arrived.
  const transactionId = suppliedTransactionId || String(order.helcim_transaction_id || '');

  const expectedCents = Math.round(Number(order.total) * 100);
  const totals = await helcimCheckoutTotals(order.id, expectedCents, transactionId || undefined);
  if (!totals.paid) return order;

  if (totals.foodCents !== expectedCents) {
    throw new Error(
      `Card payment does not match the order total (expected ${expectedCents}c, paid ${totals.foodCents}c).`,
    );
  }

  const updates = {
    payment_status: 'paid',
    status: order.status === 'pending' ? 'confirmed' : order.status,
    // The card form takes one amount and reports no separate tip, so the tip the
    // customer chose on our own page (already inside the total just verified) is
    // the one to keep — otherwise it would be wiped off the order.
    tip: totals.tipCents > 0 ? totals.tipCents / 100 : (Number(order.tip) || 0),
    total: totals.receivedCents / 100,
    helcim_transaction_id: totals.transactionId || order.helcim_transaction_id || '',
    manual_pay_required: false,
  };
  await base44.asServiceRole.entities.Order.update(order.id, updates);

  // The Square POS ticket and the kitchen push are unchanged by this build: a
  // A card-paid order enters the same fulfilment path every other order uses.
  const paidOrder = { ...order, ...updates };
  await pushOrderToSquareAndKitchen(base44, paidOrder);
  return paidOrder;
}

// The settlement check behind the phone pay page and the admin payment actions:
// it re-reads the processor and hands back the refreshed order, and it never throws —
// a page that cannot read the payment shows the order as it is rather than
// erroring out in the customer's face.
export async function settleHelcimPhonePayment(base44: any, order: any) {
  if (order.payment_provider !== 'helcim' || order.payment_status === 'paid') return order;
  try {
    return await settleHelcimCheckoutOrder(base44, order);
  } catch (error) {
    console.error(`Card settlement check failed for order ${order.order_number}:`, (error as Error).message);
    return order;
  }
}

// Tasty Threads merch paid on a card secure page: verify the payment to the
// cent, then fulfil exactly as the card path does. Printful is only asked to
// produce anything once the money is confirmed.
export async function settleHelcimMerchOrder(base44: any, merchOrder: any, suppliedTransactionId?: string) {
  // The same rule as a food order: the transaction the card fields produced is recorded
  // on the merch order, so a later attempt can still verify that payment.
  const transactionId = suppliedTransactionId || String(merchOrder.helcim_transaction_id || '');
  if (!merchOrder.helcim_checkout_id && !transactionId) {
    return { ok: false, reason: 'no card payment page on this order' };
  }
  if (merchOrder.payment_status === 'paid') return { ok: true, already_paid: true };

  const expectedCents = Math.round(Number(merchOrder.total) * 100);
  const totals = await helcimCheckoutTotals(merchOrder.id, expectedCents, transactionId || undefined);
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
  console.log(`Merch order ${merchOrder.order_number} marked paid (card)`);

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