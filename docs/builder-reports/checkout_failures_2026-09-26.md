# Builder report: checkout_failures_2026-09-26

11 items in this batch.

## APPLIED-CHANGE REVIEW — the 18:52 change did NOT zero out online orders (its client half is not deployed)

**Status:** draft  
**App entity:** BuilderReport `6ab81e0958348e654c34c742`

### Before

Live Checkout bundle markers: 'Turn off any ad blocker' = false, 'We could not open the secure payment form' = false, 'Loading the secure card form' = false, fingerprint logic = false; pre-change generic string present (old build). Recorded content: BuilderReport 'APPLIED 2026-09-26'.

### After

What landed at 18:52: (1) cart fingerprint + reuse of the existing pending order on retry — NOT live; (2) card-form load error + retry UI — NOT live; (3) surfacing the server's own error text instead of a generic customer message — NOT live; (4) publishable-key presence check returning 503 before intent/order creation — LIVE. Also note operationally: the live site is NOT running the current code — a publish is pending.

---

## ROOT CAUSE STATUS — narrowed: nothing has reached Stripe since 17:38:04; failure is upstream of card entry (NOT yet pinned)

**Status:** draft  
**App entity:** BuilderReport `6ab81e0958348e654c34c743`

### Before

ELIMINATED with evidence: card-entry/charge failure; keys, key mode and secrets path; both customer-facing endpoints (createPaymentIntent returns a correct 400, getStripePublishableKey returns 200 + live key); the pricing authority rejecting valid carts (probe built from the live menu: server agreed on 6.15 subtotal / 0.37 tax and computed 6.52 total, failing only on a deliberately wrong total); catalog price/id drift (today's four real carts all recompute to identical prices); catalog window cap (257 items — under the 500 limit); closed/cutoff/closure states (all clear); the 5-mile delivery change (all four of today's orders were pickup); analytics crashing the checkout page.

### After

STILL OPEN: whether the browser never calls the payment function, or calls it and gets a 4xx — both leave no trace before any record is written. Two data points needed, neither reachable from my tools: (1) the exact on-screen error customers see — 'Could not initialize payment. Please try again.' means the request DID reach the server and was rejected; (2) the payment function's run logs for 17:35-17:45 UTC in the dashboard Logs explorer (I can invoke functions live, but cannot read historical run logs).

---

## CANDIDATE KILLED — payment key / publishable key read two different ways (not the cause)

**Status:** draft  
**App entity:** BuilderReport `6ab81e0958348e654c34c741`

### Before

CANDIDATE TRIGGER — payment key read two different ways (unconfirmed, flagged as leading candidate)

### After

KILLED. createPaymentIntent reads the publishable key via runtime secrets with a Deno.env fallback; getStripePublishableKey reads the same secret via runtime secrets only — same secret, same value, both live, both working. Independently, no PaymentIntent has been created since 17:38:04 UTC, so every failure is upstream of the key's first use anyway.

---

## PROPOSED FIX — NOT APPLIED (needs Wesley's emailed approval)

**Status:** draft  
**App entity:** BuilderReport `6ab81e0958348e654c34c744`

### Before

Today a rejected checkout shows the customer only a generic 'Could not initialize payment. Please try again.', and writes nothing at all — no order, no intent, no visible log. So the failure is invisible to the store and undiagnosable after the fact, which is why this incident is still open.

### After

Proposed, in order: (1) log a structured rejection reason for every early exit in the payment function (reason, order type, item count, attempt id) so any future rejection is visible in Logs; (2) publish the already-written client change that surfaces the server's own error text instead of the generic message; (3) for price/catalog disagreements, replace the hard dead-end with a re-price-and-confirm flow (show the corrected total and let the customer accept it) so a stale cart can never block a sale; (4) review and decide on the fail-closed publishable-key check added at 18:52 — keep, soften, or remove.

---

## APPLIED 2026-09-26 — checkout stranded-order fix shipped (Wesley approved in chat)

**Status:** applied  
**App entity:** BuilderReport `6ab8146cc1d00068cd40ece6`

### Before

First payment attempt could leave the customer on an unusable payment step with no card form and no message, holding a pending Order that was never charged; tapping Back from the payment step and continuing again created a second Order + PaymentIntent for the same cart (10 stranded rows found, all $0.00, kitchen never alerted).

### After

SHIPPED: (1) checkout reuses the Order + PaymentIntent already created for the same cart — Back-then-Continue, a retry, and a failed Apple/Google Pay attempt all return to that one order instead of creating a duplicate; (2) checkout refuses to advance to the payment step unless the card secret and key came back, so there is no silent dead step; (3) if Stripe.js fails to load the customer now sees why plus a Retry button, and a card field that is not ready says so instead of the Pay button doing nothing; (4) the real server message is shown instead of a generic one; (5) the intent function reads the Stripe key the same way as the app's other Stripe function and fails BEFORE creating anything if it is unavailable. Verified: no customer was ever double-charged; the function still boots and returns the normal price-check rejection before any charge.

---

## Customer-facing error is not captured — make the real failure visible and stop the silent dead end

**Status:** draft  
**App entity:** BuilderReport `6ab80c87201a7017c7a3f053`

### Before

The checkout's error handling shows only a generic 'Could not initialize payment. Please try again.' for any initialization failure, and the wallet button shows the misleading 'Apple Pay / Google Pay is not available on this device' when a sheet is merely cancelled. If the card field cannot load, the payment step renders with no message at all.

### After

PROPOSED (needs approval): log the real error together with the order number so it is diagnosable; show a specific customer message; treat a cancelled wallet sheet as a cancel rather than a device error; and if the payment step cannot initialize, show an explicit error with a retry instead of an unusable panel.

---

## CANDIDATE TRIGGER — payment key read two different ways (verify against the 17:35 log)

**Status:** draft  
**App entity:** BuilderReport `6ab80c87201a7017c7a3f054`

### Before

The intent function returns the publishable Stripe key from an environment-variable read, while the app's other Stripe function reads the same key through the runtime secrets API. If the env read ever comes back empty, the checkout page is handed no key, the card panel never renders, and the customer is left on a payment step they cannot use — matching the stranded $0 intents exactly.

### After

PROPOSED (needs approval): read the key the same way in both places, and have checkout show a clear 'payment unavailable, please retry' state instead of a dead payment step when no key is returned.

---

## Secondary (not today's cause) — order numbers repeat every 16 min 40 s

**Status:** draft  
**App entity:** BuilderReport `6ab80c87201a7017c7a3f055`

### Before

Order numbers are the last 6 digits of the timestamp, so they cycle every 16 minutes 40 seconds. The post-payment confirmation fallback and the order-status lookup both match orders by that number and take the first hit.

### After

PROPOSED (needs approval, separate from today's fix): generate a genuinely unique order number, and have the confirmation fallback match on the payment intent instead of the order number.

---

## ROOT CAUSE — the first attempt never reached Stripe: intent + Order created, payment step never completed

**Status:** draft  
**App entity:** BuilderReport `6ab80c87201a7017c7a3f050`

### Before

Order 121109 (Jacqueline Basham) 17:35:21 created PaymentIntent pi_3UJzVN2EuNIUYDBz08JFamFS plus an Order, then stopped: intent still requires_payment_method, amount_received $0.00, latest_charge null, last_payment_error null. She re-entered checkout 2m43s later, creating a BRAND-NEW Order (283879) which paid normally. Identical signature on 9/18 (919891), 9/19 (154371), 9/20 (073539), 9/26 (851353), plus 960790, 640427, 882906, 448245 — all $0 with no Stripe error.

### After

PROPOSED FIX (needs approval before deploy): (1) when a retry happens for the same cart, reuse the existing pending Order + PaymentIntent instead of creating a second one; (2) if the payment step fails to initialize, cancel the stranded intent and close the pending Order; (3) add a sweep that auto-closes pending Orders that were never charged after ~30 min (Square push never happened, kitchen alert never sent).

---

## VERIFIED — customers were NOT double-charged

**Status:** draft  
**App entity:** BuilderReport `6ab80c87201a7017c7a3f051`

### Before

Question: did a stuck-pending first attempt still take the money, with the retry charging a second time?

### After

No fix needed. Every unconfirmed intent shows amount_received $0.00, latest_charge null and no last_payment_error. Only the retry charged (pi_3UJzXz2EuNIUYDBz0EyqwNm8, $8.24, charge ch_3UJzXz2EuNIUYDBz0MqEJYU6).

---

## VERIFIED — no duplicate MenuSetting row exists; delivery settings are not involved

**Status:** draft  
**App entity:** BuilderReport `6ab80c87201a7017c7a3f052`

### Before

Suspect: a stale duplicate MenuSetting (6ab4183e4711a9cd6d329a3f, 3-mile-only tiers) was making checkout read inconsistent delivery validation, closed message or fees.

### After

No fix needed for this. Only ONE settings row exists (6a619923321f89b8d1cf8b3f); the claimed duplicate returns 'not found'. No records at 2026-09-23 18:19:42 exist in PhoneMessage (2 rows total) or SmsConversation (73 rows).
