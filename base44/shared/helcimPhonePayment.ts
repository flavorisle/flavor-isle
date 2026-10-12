import { createHelcimCheckoutLink, helcimConfigured, HELCIM_NOT_CONFIGURED } from './helcimCheckout.ts';
import { createSquarePhonePayment } from './squarePhonePayment.ts';
import { createStripePhonePayment } from './stripePhonePayment.ts';

// The phone / text / website-chat payment link when the owner's phone switch is
// on Helcim (issue #97, Part B step 11). Mirrors shared/squarePhonePayment.ts:
// the link is created for the order's own total, verified before it is handed
// out, and recorded on the order so the sweeper can settle it.
//
// The caller (logPhoneOrder) catches a failure here and falls back to the Square
// link, so an unconfigured or unhappy Helcim can never leave a caller without a
// way to pay.
export async function createHelcimPhonePayment(base44: any, order: any) {
  if (!helcimConfigured()) {
    throw new Error(HELCIM_NOT_CONFIGURED);
  }

  const link = await createHelcimCheckoutLink({
    invoiceNumber: order.id,
    orderNumber: order.order_number,
    amountUsd: Number(order.total) || 0,
    payPageOrigin: 'https://flavor-isle.com',
    allowTipping: true,
  });

  await base44.asServiceRole.entities.Order.update(order.id, {
    payment_provider: 'helcim',
    helcim_checkout_id: link.checkoutToken,
    payment_url: link.url,
    manual_pay_required: false,
  });

  return link.url;
}

// The phone payment link for whichever processor the phone switch names, with
// the Helcim fallback in one place: when Helcim has no credentials yet (or
// cannot open a page), the caller gets the Square link instead of an error. A
// customer must never be left without a way to pay.
export async function createPhonePaymentLink(base44: any, order: any, provider: string) {
  if (provider === 'helcim') {
    try {
      return await createHelcimPhonePayment(base44, order);
    } catch (error) {
      console.warn(
        'Helcim phone payment link unavailable — using the alternate Square link instead:',
        (error as Error).message,
      );
      return createSquarePhonePayment(base44, order);
    }
  }
  return provider === 'square'
    ? createSquarePhonePayment(base44, order)
    : createStripePhonePayment(base44, order);
}