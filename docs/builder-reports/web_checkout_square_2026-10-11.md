# Builder report: web_checkout_square_2026-10-11

Issue #95 — "BUILD: Web checkout moves to Square — Stripe stays as full backup (approved Oct 11)", including Addendum A ("Plus referral").

8 items in this batch.

---

## 1. Website payment-page switch — owner-controlled, Stripe stays the default

**Status:** applied

### Before

The website checkout had one processor baked in (`createPaymentIntent`, Stripe). No way to move the website's payment page without a code change.

### After

NEW `base44/shared/squareWebCheckout.ts` — hosted secure payment pages (create, verify the total to the cent, delete an unusable link).

SmashieSettings gains `web_payment_provider` (`stripe` | `square`), default `stripe`:

    web_payment_provider: { type: string, enum: ["stripe","square"], default: "stripe" }

`base44/shared/smashieSettings.ts`:

    export function webPaymentProvider(settings) {
      return settings?.web_payment_provider === 'square' ? 'square' : 'stripe';
    }

Anything unrecognized falls back to the live card path, so a typo can never strand a web order. Toggle lives in Admin → Communications (SmashieSettingsPanel). The phone line keeps its own independent switch (`phone_payment_provider`, currently `square`).

---

## 2. Food orders on the alternate page

**Status:** applied

NEW `base44/functions/createSquareWebCheckout/entry.ts` — the validation front half is `createPaymentIntent`'s, unchanged (blocked-customer check, loyalty phone check, reward validation against the live program, authoritative re-pricing of the whole cart). Only after the order is verified and saved `pending`/`pending` does it open the hosted page and hand back its URL.

- Saved order carries `payment_provider: 'square'`, `status: 'pending'`, `payment_status: 'pending'`, and the food total only (the tip is chosen on the secure page, exactly like the pay link Smashie texts).
- The link's idempotency key is the order id (`web-square-${order.id}`), so a retried request can never mint a second payable page; an order that already carries one is reused.
- Square's own recomputed checkout total is compared against the saved total BEFORE the URL is handed to a customer; a mismatch deletes the link and the stranded pending order and refuses the request (502, nothing charged).

Checkout.jsx: `else if (webProvider === 'square')` branch (line 531) invokes it and follows `payment_url`; the customer comes straight back to `/order-confirmation?order_number=…&square=1`.

---

## 3. Split (group) shares on the alternate page

**Status:** applied

`createGroupPayment` — Square branch (line 161). One shared order, then one hosted link per person for their own share; each share's link is recorded on `GroupPaymentShare.square_checkout_order_id`, and `squareCheckoutSettlement` matches each Square payment against `expected_amount` (a short payment fails the share, so an underpayment never settles the parent order).

Checkout.jsx renders those links on the split screen via `src/components/checkout/SquareShareLinks.jsx`; Stripe shares keep paying in-app as before.

---

## 4. Tasty Threads (merch) on the alternate page

**Status:** applied

`createMerchCheckout` — Square branch (line 107). Catalog prices and shipping are still verified against Printful first (server authority), the MerchOrder is saved `pending`, and the hosted page is created for the verified total. `MerchConfirmation` verifies the return. Printful is only asked to produce anything after the payment is verified to the cent.

---

## 5. Refunds and cancellations on the alternate page

**Status:** applied

- `cancelOrder` (line 45): Square-branch cancel + refund, `square_refund_amount` recorded, customer emailed/texted as before.
- `refundOrder` (line 29): refunds through whichever system took the money.
- `base44/shared/squareRefund.ts` — Square refunds.
- `base44/shared/posOrderCancellation.ts` — a register cancellation/refund mirrored from Square still cancels the board order and tells the customer.

---

## 6. Settlement safety net

**Status:** applied

`base44/shared/squareCheckoutSettlement.ts` + `autoSyncUnpushedOrders`: an order that was paid but whose customer never returned to the confirmation screen is still settled — payment verified, `payment_status: 'paid'`, then `pushOrderToSquareAndKitchen` sends it to the restaurant and the kitchen exactly once. Pending Square merch orders are retried the same way.

---

## 7. FIX — Square refused every alternate link (CONFLICTING_PARAMETERS)

**Status:** applied — found and fixed during verification of this batch

### Before

`createSquareCheckoutLink` (and the phone pay link) sent BOTH a pickup `fulfillments` entry and `pre_populated_data.buyer_email` whenever the customer had an email on file. Square rejects that combination outright:

    HTTP 400 INVALID_REQUEST_ERROR / CONFLICTING_PARAMETERS
    "Only one of [fulfillment, buyer_email] fields should be set."

Because every link this app creates carries a fulfillment, every alternate-path link failed for any order with an email — the web path (all orders), the phone pay link (any caller with an email on file, and the phone line is already on Square), group shares, and merch.

### After

No `pre_populated_data.buyer_email` is ever sent; the customer's email still rides on the fulfillment recipient, which Square accepts.

    base44/shared/squareWebCheckout.ts   — option removed from the request (comment added)
    base44/shared/squarePhonePayment.ts  — same removal
    base44/functions/createSquareWebCheckout/entry.ts  — buyerEmail arg dropped
    base44/functions/createMerchCheckout/entry.ts      — buyerEmail arg dropped
    base44/functions/createGroupPayment/entry.ts       — buyerEmail arg dropped

### Evidence (controlled test, live Square sandbox-to-production account)

Switch temporarily set to the alternate page, one real order created through `createSquareWebCheckout`, then fully cleaned up:

    request  : Hamburger x1 @ 4.25, pickup/counter, tax 0.26, total 4.51, tip 0
    response : { provider: "square", orderNumber: "024544",
                 payment_url: "https://square.link/u/nVXoSUWk", total: 4.51 }
    Square's own checkout order total : 451 cents  → matches the saved 4.51 to the cent
    cleanup  : payment link deleted (200), Square order gone (404 on re-cancel),
               test Order record deleted
    switch   : restored to web_payment_provider = "stripe" (phone stays "square")

Note: the switch was toggled twice for this test, so the settings change-notice flow fired as designed. The merch and group-share links share the repaired helper; the food path is the one exercised live here.

---

## 8. Addendum A — referral on the Square path

**Status:** applied — wiring + verification only; referral logic untouched

### Wiring

- `src/pages/Checkout.jsx`: `?ref=` capture unchanged (`getActiveReferralCode`, line 194). The Square branch passes `referralCode: referralCode || undefined` (line 547) exactly as `createPaymentIntent` gets it (line 579); group branch line 510, other path line 718. No UI change to ReferralCapture.jsx.
- `base44/functions/createSquareWebCheckout/entry.ts` persists both fields on the Order:

      referral_code: normalizeReferralCode(referralCode),   // line 154
      direct_web_rewards_v2: true,                          // line 155

### Lifecycle is identical, so every v2 bonus fires the same

- pending → confirmed/paid: `base44/shared/squareCheckoutSettlement.ts` (line 47 `payment_status: 'paid'`, line 56 `pushOrderToSquareAndKitchen`).
- → completed: `base44/functions/syncSquareOrderStatus/entry.ts` line 203 calls `grantCompletedWebOrderBonuses` on the status transition.
- `base44/shared/webOrderLoyaltyBonuses.ts` line 71 gates on `isCompletedPaidWebOrder` (lines 7–11): `direct_web_rewards_v2 === true && status completed && payment_status 'paid'` — provider-agnostic, so the referrer's 50 Stars, the 2nd-order 50, birthday 100 and 30-day winback 100 land on the alternate path exactly as on the card path.
- Confirmation email: the referral share block is built from the shared `base44/shared/fulfillOrder.ts` (code line 77, block line 112, `referralBlockHtml` line 40) — same block for both paths, same code display, no processor or brand names anywhere customer-facing.

### Evidence — square-path order payload carrying both fields

    Order 024544 (created live through createSquareWebCheckout, switch on the alternate page)
      status                  : pending
      payment_status          : pending
      payment_provider        : square
      referral_code           : REFCHK01        ← captured from the checkout's ?ref= path
      direct_web_rewards_v2   : true            ← v2 bonus eligibility for web orders
      subtotal/tax/total      : 4.25 / 0.26 / 4.51   (tip 0 — chosen on the secure page)
      square_payment_link_id  : 2ZO4CU2QE5CYKKSS
      square_checkout_order_id: 2f0cwjLk7hunHJC923YLo7zko1PZY
      payment_url             : https://square.link/u/nVXoSUWk

    (Reference code used for the test; the code was deleted with the order before it could
    ever complete, so no Stars were granted and no customer was touched.)

The referral-bonus engine is live and has already granted referrals on the existing path (Orders with `referral_bonus_granted_at` present), and that engine is byte-identical for the alternate path — it reads the two fields above and nothing else.

### Untouched-file confirmation

    $ git log --oneline -1 -- base44/shared/referral.ts
    8311eb3 Implement end-to-end customer referral program
    $ git log --oneline -1 -- base44/shared/webOrderLoyaltyBonuses.ts
    8311eb3 Implement end-to-end customer referral program
    $ git status --porcelain base44/shared/referral.ts base44/shared/webOrderLoyaltyBonuses.ts
    (no output — working tree clean for both files)

    HEAD: d22f517 Integrate referral tracking into alternate checkout flow
    Only the files listed in items 1–7 above were changed in this batch.

### Guardrails held

50 Stars to the referrer only (never the friend); once per friend, ever; self-referral blocked; referrer must already have a Square loyalty account (no auto-enrollment); kitchen tickets show nothing referral-related; no processor names customer-facing; menu untouched.

---

## Switch state after this build

    web_payment_provider  : stripe   (live default — the owner flips it in Admin → Communications)
    phone_payment_provider: square   (unchanged)

Stripe remains the full backup on both paths: with the switch on the card path, the website behaves exactly as it did before this build.