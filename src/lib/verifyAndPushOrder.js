import { base44 } from '@/api/base44Client';

// Provider-aware "verify the payment, then push the order again" — the retry
// behind the Failed order alert and the Square sync log's Retry buttons.
//
// Each order is re-verified by the processor that actually took the money: Square
// orders through settleSquareWebPayment, orders paid on the platform's secure page
// through settleWixWebPayment (issue #116). Both are the same idempotent
// verify-and-push the overnight sweeper runs. An order with neither provider is
// refused rather than guessed at — nothing is invoked for it.
export async function verifyAndPushOrder(orderNumber) {
  const number = String(orderNumber || '').trim();
  if (!number) return { ok: false, message: 'No order number to retry.' };

  const [order] = await base44.entities.Order.filter({ order_number: number }, '-created_date', 1);
  const provider = order?.payment_provider;

  if (provider !== 'square' && provider !== 'wix') {
    return {
      ok: false,
      unsupported: true,
      message: `#${number} was not paid through a processor this button can re-verify. Check the sync log for the reason.`,
    };
  }

  try {
    const fn = provider === 'square' ? 'settleSquareWebPayment' : 'settleWixWebPayment';
    await base44.functions.invoke(fn, { order_number: number });
    return { ok: true };
  } catch {
    return { ok: false, message: `Retry could not finish for #${number}. Check the sync log for the reason.` };
  }
}