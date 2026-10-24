import { createSquarePhonePayment } from './squarePhonePayment.ts';
import { wixPayPageUrl } from './wixCheckout.ts';

// The phone / text / website-chat payment link, provider-aware (issue #116, Part A
// step 4). Base44 Payments (Wix) is the primary path: the link is our own /pay page
// for the order's own number, and the pay button on it opens the platform checkout
// for the exact saved total. Square stays as the alternative and keeps its own link.
//
// A link is always recorded on the order, so it can be re-sent and so the sweeper can
// settle the order if the customer never comes back to it.
const PAY_PAGE_ORIGIN = 'https://flavor-isle.com';

export async function createPhonePaymentLink(base44: any, order: any, provider?: string) {
  const wanted = provider === 'square' ? 'square' : 'wix';

  if (wanted === 'square') {
    // The Square branch is unchanged: its own hosted link, verified to the cent.
    return createSquarePhonePayment(base44, order);
  }

  const url = wixPayPageUrl(PAY_PAGE_ORIGIN, order.order_number);
  await base44.asServiceRole.entities.Order.update(order.id, {
    payment_provider: 'wix',
    payment_url: url,
    manual_pay_required: false,
  });
  return url;
}