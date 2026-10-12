import { createHelcimCheckoutLink, helcimConfigured, HELCIM_NOT_CONFIGURED } from './helcimCheckout.ts';

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