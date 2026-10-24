import { withTimeout } from './withTimeout.ts';

// Base44 Payments (Wix) as the PRIMARY secure-payment path (issue #116, Part A).
//
// Every card charge this app takes is created here: the website food checkout, the
// phone/Tasty Threads pay page, and merch. The order is always saved and re-priced
// first, so the amount handed to the provider is the amount this app stored — a
// tampered request body can never change what is charged.
//
// Wix has no custom-metadata field, so the returned checkout session id is the ONLY
// correlation key back to our order. It is persisted on a pending Base44Purchase
// BEFORE the customer is redirected; the platform's payments-webhook resolves the
// purchase by that id (order.checkoutId === checkoutSession.id) and settles the order
// only when the provider's total equals the saved total to the cent.
//
// FAIL CLOSED: with no credentials or no server-owned app URL, nothing is created and
// the caller falls back to the Square path rather than handing out a dead link.
const CONSTRUCT_URL = 'https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct';

export function wixCheckoutConfig(): { apiKey: string; siteId: string } | null {
  const apiKey = (Deno.env.get('WIX_CHECKOUT_API_KEY') || '').trim();
  const siteId = (Deno.env.get('WIX_CHECKOUT_SITE_ID') || '').trim();
  return apiKey && siteId ? { apiKey, siteId } : null;
}

export function wixCheckoutConfigured(): boolean {
  return wixCheckoutConfig() !== null;
}

export const WIX_NOT_CONFIGURED =
  'Secure card payments are not set up yet, so no secure payment page was created.';

// The app's public base URL for the buyer's return links. The platform-injected
// header first (correct behind custom domains), then the server-owned secret. Never
// the request Origin: it is caller-controlled, so a spoofed Origin would send the paid
// buyer to an attacker page.
export function resolveAppUrl(req: any): string {
  const header = req?.headers?.get?.('x-base44-app-url') || '';
  return String(header || Deno.env.get('WIX_CHECKOUT_APP_URL') || '').trim().replace(/\/$/, '');
}

// Our own page for one order, wherever the customer came from. The link carries only
// the order number, never a checkout session, so a re-sent link still works.
export function wixPayPageUrl(payPageOrigin: string, orderNumber: string, fromCheckout = false) {
  const base = `${payPageOrigin}/pay?order_number=${encodeURIComponent(orderNumber)}`;
  return fromCheckout ? `${base}&from=checkout` : base;
}

export async function openWixCheckoutSession(base44: any, opts: {
  orderNumber: string;
  itemName?: string;
  amount: number;
  appUrl: string;
  thankYouPath: string;
  postFlowPath?: string;
  appUserId?: string | null;
  buyer?: { email?: string; firstName?: string; lastName?: string; phone?: string } | null;
}): Promise<{ checkoutSessionId: string; redirectUrl: string }> {
  const config = wixCheckoutConfig();
  if (!config) throw new Error(WIX_NOT_CONFIGURED);

  const amountCents = Math.round(Number(opts.amount) * 100);
  if (!Number.isFinite(amountCents) || amountCents < 50) {
    // Wix rejects charges under 0.50 in the charged currency (major units).
    throw new Error('An order must be at least $0.50 to pay by card.');
  }
  if (!opts.appUrl) throw new Error('The secure payment page cannot be opened right now.');

  const itemName = (opts.itemName || `Flavor Isle order #${opts.orderNumber}`).slice(0, 255);
  const buyer = opts.buyer || {};
  const customerInfo = {
    ...(buyer.email ? { email: buyer.email } : {}),
    ...(buyer.firstName ? { firstName: String(buyer.firstName).slice(0, 100) } : {}),
    ...(buyer.lastName ? { lastName: String(buyer.lastName).slice(0, 100) } : {}),
    ...(buyer.phone ? { phone: buyer.phone } : {}),
  };

  const response = await withTimeout(
    () => fetch(CONSTRUCT_URL, {
      method: 'POST',
      headers: {
        Authorization: config.apiKey,
        'wix-site-id': config.siteId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cart: {
          items: [{ name: itemName, quantity: 1, price: (amountCents / 100).toFixed(2) }],
          ...(Object.keys(customerInfo).length > 0 ? { customerInfo } : {}),
        },
        callbackUrls: {
          thankYouPageUrl: `${opts.appUrl}${opts.thankYouPath}`,
          postFlowUrl: `${opts.appUrl}${opts.postFlowPath || '/menu'}`,
        },
      }),
    }),
    12000,
    'Secure checkout',
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`The secure payment page could not be opened (${response.status}): ${errText.slice(0, 300)}`);
  }

  const { checkoutSession } = await response.json();
  const checkoutSessionId: string = checkoutSession?.id;
  const redirectUrl: string = checkoutSession?.redirectUrl;
  if (!checkoutSessionId || !redirectUrl) throw new Error('The secure payment page did not return a checkout.');

  // The join key, written before the buyer leaves. Pending until the webhook proves
  // the money arrived; productId carries our own order number so the grant knows
  // exactly which order was paid.
  await base44.asServiceRole.entities.Base44Purchase.create({
    checkoutSessionId,
    status: 'pending',
    appUserId: opts.appUserId ?? null,
    buyerEmail: buyer.email ?? null,
    productId: `order:${opts.orderNumber}`,
    productName: itemName,
    quantity: 1,
    amount: (amountCents / 100).toFixed(2),
    currency: 'USD',
  });

  return { checkoutSessionId, redirectUrl };
}