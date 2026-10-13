import { helcimPayPageUrl, helcimCanTakePayment } from './helcimCheckout.ts';

// The phone / text / website-chat payment link when the owner's phone switch is on
// Helcim. Mirrors shared/squarePhonePayment.ts: the link is our own page for the
// order's own number, recorded on the order so it can be re-sent and so the sweeper
// can settle the order if the customer never comes back to it.
//
// Helcim is the only card processor, so this is the only phone link there is. An
// account that cannot open a session (no active terminal for the currency, say) is
// treated like a missing credential: nothing is texted, and the caller
// (logPhoneOrder) flags the order for payment at the counter rather than sending a
// page that cannot be paid.
export async function createHelcimPhonePayment(base44: any, order: any) {
  if (!(await helcimCanTakePayment())) {
    throw new Error('Helcim cannot open a checkout session right now.');
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

// The phone payment link. Helcim backs every one of them; the provider argument is
// kept only so existing callers do not change shape.
export async function createPhonePaymentLink(base44: any, order: any, _provider?: string) {
  return createHelcimPhonePayment(base44, order);
}