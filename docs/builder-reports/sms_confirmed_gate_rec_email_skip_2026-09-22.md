# Builder report: sms_confirmed_gate_rec_email_skip_2026-09-22

## SMS confirmed-status consent gate + recommendation email skip-state fix

**Status:** draft  
**App entity:** BuilderReport `6ab351ace3c6765beb54b3c4`

### Before

Two additional corrections approved in chat at 11:09 PM CT (Resend 01a0cc65-3c3b-7546-a50b-3c41358b93af): (1) gate the fulfillOrder.ts order-confirmed SMS behind transactional consent + STOP + sms_status_updates_enabled toggle (fail-closed), markSmsSent on success, audit all other SMS entry points read-only; (2) fix sendOrderRecommendationEmail post-claim skips so a skip never leaves a false sent timestamp, with bounded retry / processor guard, no malt/sundae reintroduction.

### After

EDITOR-ONLY, NOT PUBLISHED, NOT LIVE-TESTED. No test SMS, no test emails, no test orders/payments, no customer contact, no A2P campaign resubmit, no Loyalty table access. No prices/discount rules, group Stripe webhook linkage, contact messages, newsletter, menu nav, rewards, SMS signup UI, or menu features changed.

=== CHANGE 1: CRITICAL SMS COMPLIANCE — base44/shared/fulfillOrder.ts ===
PATH: pushOrderToSquareAndKitchen() → confirmed-status SMS block (was lines 425-428).
BEFORE: `if (squarePushed && order.customer_phone) { await sendSmashieSms(order.customer_phone, smashieSmsTemplates.confirmed(order)); }` — fired whenever Square pushed + phone existed, bypassing transactional consent, global STOP, and the sms_status_updates_enabled toggle.
AFTER: gated by BOTH getSmashieSettings().sms_status_updates_enabled === true (fail-closed) AND checkSmsConsent(base44, phone, 'transactional').ok. On actual successful send → markSmsSent(base44, phone, 'transactional'). Suppressed when: no proof, STOP'd, invalid number, or toggle disabled. Entire block wrapped in try/catch — a suppressed or failed SMS never blocks the checkout order flow (errors logged, non-blocking). Imports added: checkSmsConsent, markSmsSent (./smsConsent.ts), getSmashieSettings (./smashieSettings.ts). This now mirrors the already-correct syncSquareOrderStatus preparing/ready/completed gate (canTxSms: toggle AND checkSmsConsent).

READ-ONLY AUDIT of every other outbound SMS entry point (no changes made to these):
- base44/functions/sendOrderReadyAlert/entry.ts: ALREADY consent-gated — checkSmsConsent(transactional) line 71-80, markSmsSent line 89. Admin-initiated manual alert; toggle not checked (acceptable for explicit admin action). NO BYPASS.
- base44/functions/sendSmsBroadcast/entry.ts: ALREADY consent-gated — checkSmsConsent(marketing)+proven, filter status=active+marketing_consent+proven_marketing_consent, markSmsSent. NO BYPASS.
- base44/functions/syncSquareOrderStatus/entry.ts: ALREADY consent-gated — canTxSms = toggle AND checkSmsConsent(transactional) (lines 227-234), markSmsSent per milestone. NO BYPASS. (This was the model for the fulfillOrder fix.)
- base44/functions/sendOptInConfirmation/entry.ts: one-time opt-in confirmation; gated on sub.opted_in && status==='active' && consent_category!=='none' (line 31); keyword opt-ins excluded (already auto-replied by Twilio webhook); STOP records never texted. Responds to consent the subscriber just granted — not unsolicited. NO BYPASS.
- base44/functions/twilioSmsWebhook/entry.ts: inbound auto-reply; conversational reply suppressed when subscriber.status==='unsubscribed' (STOP, lines 96-102); respects sms_auto_reply_enabled toggle (lines 134-140); a no-record phone that texts in first gets a reply (customer-initiated, permitted). NO BYPASS, no consent inferred.
CONCLUSION: fulfillOrder.ts:426-428 was the ONLY outbound SMS bypass. All other entry points already enforce consent/STOP/toggle correctly. No consent is inferred from phone/order/loyalty anywhere.

=== CHANGE 2: RECOMMENDATION EMAIL SKIP — base44/functions/sendOrderRecommendationEmail/entry.ts + base44/entities/Order.jsonc + base44/functions/processPendingRecommendationEmails/entry.ts ===
PATH: export default → post-atomic-claim early returns (the atomic claim sets rec_email_sent_at at lines 153-159).
BEFORE: 5 early returns after the claim (branches a/c/fallback + no-photos) returned {skipped:true} WITHOUT releasing rec_email_sent_at — leaving a 'sent_at' timestamp that falsely claimed delivery AND permanently blocked retries (the claim never re-acquired). The send-error path already released correctly; pre-claim skips (not-found, cancelled/failed/refunded, skip-email, already-sent, 7-day cooldown) never acquired the claim so were fine.
AFTER: Added helper markRecSkippedAndRelease(base44, order, reason) — atomically sets rec_email_skipped_at (terminal skip marker) AND $unset rec_email_sent_at (releases the false 'sent' claim) via updateMany with a rec_email_sent_at:{$ne:null} guard. The 5 post-claim skip returns now call it:
  - branch (a) MAIN+SIDE no DESSERT: 'no non-malt/sundae dessert available'
  - branch (c) MAIN only pairing: 'no non-malt/sundae dessert for pairing'
  - fallback no dessert: 'no non-malt/sundae dessert available'
  - fallback empty pick: 'no recommendations available'
  - post-photo-filter empty: 'no recommended items with photos'
SCHEMA (narrow addition, Order.jsonc): new field rec_email_skipped_at (date-time) — terminal skip marker distinct from rec_email_sent_at. rec_email_sent_at description updated to note it's cleared + rec_email_skipped_at set on permanent ineligibility.
PROCESSOR GUARD (processPendingRecommendationEmails/entry.ts): qualifying filter now also excludes orders with rec_email_skipped_at set — permanently ineligible orders are NOT re-enqueued (no unbounded retry, no email burst).
STATE DISTINCTION (now accurate): queued = no marker, no RecommendationEmail record, in 30min-2hr window; skipped = rec_email_skipped_at set (rec_email_sent_at null), no record; accepted/delivered = RecommendationEmail record with sent_at + rec_email_sent_at set; 7-day customer cooldown = RecommendationEmail record exists (checked separately, unaffected by skip marker).
PRESERVED: exactly-once per real order (claim + RecommendationEmail record unchanged on real send); existing 7-day customer suppression (only real sends create records, so a skip never suppresses the customer's other orders); consent/A2P independence (email path is independent of SMS consent); normal trigger cadence (30min-2hr processor window unchanged); malts/sundaes still excluded (available() filter unchanged). No backfill burst, no unbounded old-order retry, no test-only send.

=== REMAINING RISKS / NOT FIXED (carried from critical_functionality_repair_2026-09-22) ===
- Group Stripe webhook linkage: stripe_session_id='GROUP' means stripeWebhook can't match group intents by id; reconciled ONLY by client confirmOnlinePayment. Server-side backstop needs new schema (intent ids on order/side record). NOT FIXED — reported as blocker, unchanged.
- Ad-hoc modifier price authority: Deluxe toppings / shake flavors come from client configs (shakeConfig/deluxeConfig), not MenuItem records — cannot server-validate per-unit price; trusted but bounded by subtotal check. Full authority needs server-side config entity. NOT FIXED.
- Exact reward discount validation: requires Square loyalty reward-tier lookup to validate exact discount amount; capped at adjusted subtotal but not exactly validated. Full validation needs server-side reward-tier authority. NOT FIXED.
- rec_email_skipped_at is terminal for an order's recommendation window (the order's items don't change); if menu availability later changes within the 2hr window the order won't auto-retry — acceptable since the processor window itself bounds eligibility and a manual re-call re-evaluates (idempotent).

NO entity records were created or modified by the builder beyond the new Order schema field. No app Loyalty table access.
