// Base44 Payments checkout starter — base44/functions/create-checkout/entry.ts
//
// Provided by the platform. Do NOT rewrite the plumbing (session construct + persisting the
// join key + return-URL resolution). Edit only the region marked `// ===== APP-SPECIFIC =====`
// to resolve — SERVER-SIDE — what the buyer is purchasing and its price.
//
// PUBLIC by default: a buyer does NOT need to be logged in to check out. Backend function routes
// are callable anonymously, and storefront buyers often have no account — requiring login here is
// what blocks real purchases. If a buyer IS signed in we record their app-user id as the
// fulfillment target; otherwise the webhook grants by the buyer's email. Never 401 here.
//
// CRITICAL: Wix's checkout has NO custom-metadata field, so the returned `checkoutSession.id` is
// the ONLY thing that ties this payment back to this purchase. We persist it on a pending
// Base44Purchase BEFORE redirecting; the webhook resolves the purchase by that same id
// (order.checkoutId === checkoutSession.id). Skipping this write makes fulfillment impossible.

import { createClientFromRequest } from "npm:@base44/sdk";

const CONSTRUCT_URL = "https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct";

// The app's public base URL for the buyer's return links. Use the platform-injected
// `X-Base44-App-Url` header (server-set from app state — correct behind custom domains), then the
// server-owned `WIX_CHECKOUT_APP_URL` secret. We do NOT fall back to the request `Origin`: it's
// caller-controlled, so a spoofed Origin would make Wix send the paid buyer to an attacker page
// (open redirect). Both sources above are always present for a connected payments app.
function resolveAppUrl(req: Request): string {
  return (
    req.headers.get("x-base44-app-url") ||
    Deno.env.get("WIX_CHECKOUT_APP_URL") ||
    ""
  );
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }
    // Read per request, never at module scope: disconnecting payments blanks these, and a warm
    // isolate that captured them at startup would keep charging with the old credentials.
    const WIX_API_KEY = Deno.env.get("WIX_CHECKOUT_API_KEY");
    const WIX_SITE_ID = Deno.env.get("WIX_CHECKOUT_SITE_ID");
    if (!WIX_API_KEY || !WIX_SITE_ID) {
      console.error("create-checkout: Wix payment config not set");
      return new Response(JSON.stringify({ error: "Payments not configured" }), { status: 500 });
    }

    const appUrl = resolveAppUrl(req);
    if (!appUrl) {
      // Fail closed: with no server-owned app URL (both the X-Base44-App-Url header AND the
      // WIX_CHECKOUT_APP_URL secret are absent — e.g. a slug-less or partially-wired app) we'd build
      // relative return links like `/ThankYou` and strand the paid buyer. Never fall back to the
      // caller-controlled Origin (open redirect). Reconnecting payments repopulates the secret.
      console.error("create-checkout: no app URL (X-Base44-App-Url header and WIX_CHECKOUT_APP_URL both empty)");
      return new Response(JSON.stringify({ error: "Payments not configured" }), { status: 500 });
    }
    const base44 = createClientFromRequest(req);

    // Capture the buyer's app-user id IF signed in — but never REQUIRE it. This is the
    // fulfillment target the webhook grants to; when absent (anonymous buyer) the webhook grants
    // by the email the buyer enters on Wix's checkout page.
    let appUser = null;
    try {
      appUser = await base44.auth.me();
    } catch (_) {
      appUser = null;
    }

    const body = await req.json().catch(() => ({}));

    // ===== APP-SPECIFIC =====
    // Resolve what is being bought AND its price SERVER-SIDE. NEVER trust a price sent by the
    // client — a buyer can tamper the request body and pay any amount. The client sends only a
    // product identifier; look up the authoritative price here (a Product entity, a config map,
    // etc.). For a subscription, set `subscriptionInfo` (frequency/interval/billingCycles).
    // What is being bought is an ORDER this app already saved and re-priced
    // server-side (createWixWebCheckout verified every line against the menu,
    // the reward, and the tip). The client sends only the order's own identifier
    // — never a price — and the amount charged here is read back from that
    // stored order, so a tampered request body cannot change what is charged.
    const orderRef = String(body.productId ?? "").trim();
    const orderNumber = orderRef.startsWith("order:") ? orderRef.slice(6) : "";
    if (!orderNumber) {
      return new Response(JSON.stringify({ error: "Unknown order" }), { status: 400 });
    }
    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber });
    const order = orders?.[0];
    if (!order) {
      return new Response(JSON.stringify({ error: "Unknown order" }), { status: 400 });
    }
    // Only an order this app set up to pay through Base44 Payments can be
    // charged here, and only while it is still open and unpaid — so a settled or
    // cancelled order can never be charged a second time.
    if (order.payment_provider !== "wix" || order.payment_status !== "pending" || order.status === "cancelled") {
      return new Response(JSON.stringify({ error: "This order cannot be paid here" }), { status: 409 });
    }
    // Stored on the pending purchase below: this is the join key the webhook uses
    // to find this exact order when the payment is approved.
    const productId = orderRef;
    // One order, one charge — the buyer's quantities live in the order's items.
    const quantity = 1;
    const productName = `Flavor Isle order #${order.order_number}`;
    const price = Number(order.total).toFixed(2); // authoritative total, resolved server-side
    const currency = "USD";
    // One-time payment — the app sells no subscriptions.
    const subscriptionInfo = null;
    // Where Wix returns the buyer. Both MUST be real, PUBLICLY reachable routes in this app: the
    // returning buyer is often anonymous, so a missing or login-gated route strands a paid customer.
    const thankYouPath = `/order-confirmation?order_number=${encodeURIComponent(order.order_number)}&wix=1&from=checkout&ready_for=${encodeURIComponent(String(body.ready_for ?? ""))}`;
    const postFlowPath = "/menu";
    // ===== END APP-SPECIFIC =====

    const total = parseFloat(price) * quantity;
    if (!(total >= 0.5)) {
      // Wix rejects charges under 0.50 in the charged currency (major units, not cents).
      return new Response(JSON.stringify({ error: "Amount must be at least 0.50" }), { status: 400 });
    }

    const constructBody = {
      cart: {
        items: [{ name: productName, quantity, price, ...(subscriptionInfo ? { subscriptionInfo } : {}) }],
        // Prefill the signed-in buyer's email if we have one; anonymous buyers enter it on Wix.
        ...(appUser?.email ? { customerInfo: { email: appUser.email } } : {}),
      },
      callbackUrls: {
        thankYouPageUrl: `${appUrl}${thankYouPath}`,
        postFlowUrl: `${appUrl}${postFlowPath}`,
      },
    };

    const wixRes = await fetch(CONSTRUCT_URL, {
      method: "POST",
      headers: {
        "Authorization": WIX_API_KEY,
        "wix-site-id": WIX_SITE_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(constructBody),
    });

    if (!wixRes.ok) {
      const errText = await wixRes.text();
      console.error("create-checkout: Wix construct failed", { status: wixRes.status, errText });
      return new Response(JSON.stringify({ error: "Could not start checkout" }), { status: 502 });
    }

    const { checkoutSession } = await wixRes.json();
    const checkoutSessionId: string = checkoutSession?.id;
    const redirectUrl: string = checkoutSession?.redirectUrl;

    if (!checkoutSessionId || !redirectUrl) {
      console.error("create-checkout: missing checkoutSession id/redirectUrl", checkoutSession);
      return new Response(JSON.stringify({ error: "Could not start checkout" }), { status: 502 });
    }

    // PERSIST THE JOIN KEY (the whole point). Pending until the webhook flips it to "paid".
    // asServiceRole so the row is trustworthy — Base44Purchase RLS blocks client writes, so a buyer
    // can't forge a paid purchase. appUserId is the fulfillment target when known; null for an
    // anonymous buyer (the webhook then grants by buyerEmail).
    await base44.asServiceRole.entities.Base44Purchase.create({
      checkoutSessionId,
      status: "pending",
      appUserId: appUser?.id ?? null,
      buyerEmail: appUser?.email ?? null,
      // The server-resolved product key — the webhook grant reads this to decide what to unlock.
      productId,
      productName,
      // Persist the validated quantity so the webhook's grant can award the RIGHT count
      // (seats/credits/items) for a multi-unit purchase — the grant runs later from this row and has
      // no other authoritative count. (Fixed-entitlement plans keep quantity 1.)
      quantity,
      // Charged total (unit price × quantity), so the record matches what Wix charged.
      amount: total.toFixed(2),
      currency,
    });

    return new Response(JSON.stringify({ redirectUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout: unhandled error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
});