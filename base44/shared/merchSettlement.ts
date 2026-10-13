import { sendMerchConfirmationEmail } from './sendMerchEmails.ts';

// A Tasty Threads order has been paid — verified against the exact total.
// Mark it paid, tell the customer, and only then ask Printful to produce it:
// that order of the three steps is what keeps a shirt from being printed for an
// order nobody paid for.
export async function markMerchPaidAndFulfill(base44: any, merchOrder: any) {
  if (merchOrder.payment_status === 'paid') return { ok: true, already_paid: true };

  await base44.asServiceRole.entities.MerchOrder.update(merchOrder.id, {
    payment_status: 'paid',
    fulfillment_status: 'paid',
  });
  console.log(`Merch order ${merchOrder.order_number} marked paid`);

  try {
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