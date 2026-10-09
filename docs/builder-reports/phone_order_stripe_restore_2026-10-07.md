# Builder report: phone_order_stripe_restore_2026-10-07

**Item:** GitHub issue #35 — phone-order payment and settlement audit
**Status:** draft

## Findings and fixes

1. **Square-default switch (critical)** — `logPhoneOrder` now creates a Stripe PaymentIntent (`createStripePhonePayment`) and texts `flavor-isle.com/pay/:orderNumber`. The `/pay` page no longer has a Square branch, so the approved issue #18 embedded form and smart tip prompt (suggested / flat-dollar / custom / skip) apply again, with no processor named to customers. `sendPhonePaymentLink` now resends the Stripe link and replaces any leftover Square link (closed only after Square confirms it).
2. **Settlement without a /pay return** — Stripe settlement is server-side: `stripeWebhook` plus the 5-minute `autoSyncUnpushedOrders` sweep (verifies the PaymentIntent with Stripe, then calls the idempotent `confirmOnlinePayment`). Phone orders settle only for a succeeded USD payment equal to the stored total (`phoneIntentMatchesOrder`). `confirmOnlinePayment` no longer marks a phone order paid on the caller's word. For legacy Square orders, `settleSquarePhonePayment` now fetches the full order when a search result has no `tenders`.
3. **order_source / cleanup** — `logPhoneOrder` sets `order_source: 'online'` (existing enum value, so review, loyalty and metrics queries keep working). `cleanupStaleOrders` closes pending phone orders that never got a pay link instead of keeping them as group orders; group orders and other sources are unchanged.
4. **Delivery fee** — `logPhoneOrder` adds the delivery fee server-side (flat fee or `getDeliveryQuote` tiers), rejects delivery while `MenuSetting.delivery_enabled` is false, and stores `delivery_fee`. Tax stays on food only (`taxMath`), and the PaymentIntent amount is checked against subtotal + tax + fee + tip before it is created.
5. **Price always spoken** — the reply to Smashie includes the total (and delivery fee) even when the link text fails.

## Tests

`npm test` (node:test) covers pay-link URL, totals with delivery fee, order_source value and the settlement amount/currency/status guard.

## Residual risks / first live payment checklist

- Place a pickup and a delivery phone order; confirm the text link opens `flavor-isle.com/pay/...` and the total matches the price Smashie read.
- Pay and close the tab without returning; confirm the order turns paid and reaches Square/kitchen within 5 minutes, with one POS ticket.
- Confirm `STRIPE_WEBHOOK_SECRET` is configured and `payment_intent.succeeded` is delivered.
- Orders created during the Square window and still unpaid show "pay at the counter" until staff use Resend payment link.
- An order whose tip was saved on the PaymentIntent but not on the order will not auto-settle (amount mismatch is logged); staff reconcile it.
