import { helcimPayPageUrl, helcimConfigured, HELCIM_NOT_CONFIGURED } from './helcimCheckout.ts';
import { createSquarePhonePayment } from './squarePhonePayment.ts';
import { createStripePhonePayment } from './stripePhonePayment.ts';

// The phone / text / website-chat payment link when the owner's phone switch is on
// Helcim. Mirrors shared/squarePhonePayment.ts: the link is our own page for the
// order's own number, recorded on the order so it can be re-sent and so the sweeper
// can settle the order if the customer never comes back to it.
//
// The caller (logPhoneOrder) catches a failure here and falls back to the Square
// link, so an unconfigured or unhappy Helcim can never leave a caller without a
// way to pay.
export async function createHelcimPhonePayment(base44: any, order: any) {
  if (!helcimConfigured()) {
    throw new Error(HELCIM_NOT_CONFIGURED);
  }

  // The Helcim session — and the tip the customer picks on the page — is created
  // when they open the link, so the same link can be texted again later without
  // carrying a session that has already expired.
  const url = helcimPayPageUrl('https://flavor-isle.com', order.order_number);

  await base44.asServiceRole.entities.Order.update(order.id, {
    payment_provider: 'helcim',
    payment_url: url,
    manual_pay_required: false,
  });

  return url;
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