# Builder report: critical_functionality_repair_2026-09-22

## Critical functionality repair (approved 5-part)

**Status:** draft  
**App entity:** BuilderReport `6ab34e7b1d2abf26fe1feb5d`

### Before

Read-only audit full_functionality_audit_2026-09-22 available. Approved 5-part repair scope emailed to wesleyrbooker1@gmail.com (Resend 01a0cc5b-124c-72bf-af91-354c896c230c, approved Sep 22 10:52 PM CT).

### After

EDITOR-ONLY BUILD, NOT PUBLISHED, NOT LIVE-TESTED. No test orders, Stripe charges, outbound emails/SMS, or customer contact. No item prices, promo %, schedule, Square catalog, kitchen ticket discount visibility, or email frequency changed. October Star Rewards promo untouched; Loyalty table not accessed.

FILES CHANGED (7):
1. base44/entities/ContactMessage.jsonc (NEW) — durable admin-inbox entity: name, email, message, status(pending/sent/failed), sent_at, error_message, client_ip, content_hash. RLS: create public, read/update/delete admin.
2. base44/shared/verifyOrderPricing.ts (NEW) — server pricing authority: recomputes subtotal (MenuItem.price + catalog modifier prices by id), Happy Hour (MenuSetting, online-only 2-6 PM Chicago, 50% Classic Drinks), tax 6%, delivery fee (getDeliveryQuote tiers or MenuSetting flat). Validates each component vs client within 1c; rejects mismatch. Reward discount capped at adjusted subtotal; tip clamped >=0.
3. base44/functions/sendContactMessage/entry.ts (REWRITE) — creates ContactMessage (pending) BEFORE email; SendEmail best-effort; updates status sent/failed. Dedupe by content_hash within 10min (no duplicate send if accepted). Rate limit 5/IP/hour. Validation + email regex. Returns accepted (not 'delivered'). Recipient unchanged: hello@flavor-isle.com.
4. src/pages/Contact.jsx (EDIT) — removed false-success catch; genuine retryable error banner (AlertCircle), form text preserved; success now 'Message Received' (no mailbox-delivery promise).
5. base44/functions/createPaymentIntent/entry.ts (REWRITE) — verifyOrderPricing BEFORE intent; create Order with stripe_session_id=intent.id; on Order.create failure CANCEL the unconfirmed intent + log RECONCILIATION + return 500 (no payable flow without persisted order). Stores authoritative server subtotal/tax/deliveryFee/happyHour/discount/tip; charges validated clientTotal. SMS consent: inspects upsertSmsConsent result.ok; returns smsConsentStored flag; logs failure; never claims enrollment.
6. base44/functions/createGroupPayment/entry.ts (REWRITE) — verifyOrderPricing (group total) + splits-sum check BEFORE intents; Order.create failure now returns 500 (no intents created) — no longer swallowed; per-person intents, on any intent failure cancels all created intents + returns 500. stripe_session_id stays 'GROUP' (webhook linkage unchanged — see BLOCKER). SMS consent inspected, returns smsConsentStored.
7. src/pages/Checkout.jsx (EDIT) — useToast import + 2 non-blocking toasts when smsConsentStored===false ('Text sign-up failed… retry from account'). No checkout logic changed.

SAFETY: (1) No payable intent without persisted Order — single cancels intent on DB fail; group returns before intents. (2) Pricing authority rejects manipulated carts before charge; authoritative values stored on order. (3) Contact dedupe prevents double-email; failed sends retained as failed (retryable). (4) Consent fails closed (no consent record = no SMS); never claims enrollment. (5) Idempotency preserved: createSquareOrder atomic claim, webhook handlers, confirmOnlinePayment, fulfillOrder push/email dedupe all UNCHANGED. (6) One Square push + one customer confirmation + one staff alert per paid order preserved (fulfillOrder.ts untouched). Recommendation/review-request cadence + dedupe untouched.

PENDING APPROVAL (NOT FIXED — per Part 5):
- Confirmed-SMS consent/STOP bypass: fulfillOrder.ts:426-428 fires the order-confirmed SMS via sendSmashieSms with NO checkSmsConsent / STOP / sms_status_updates_enabled gate. UNCHANGED — pending separately emailed approval. (syncSquareOrderStatus preparing/ready/completed remain consent-gated.)
- Skipped-recommendation-email claim retention: sendOrderRecommendationEmail sets rec_email_sent_at then returns on content-skip paths WITHOUT $unset — order never retries. UNCHANGED — pending separately emailed approval.

BLOCKED / UNFINISHED (reported, not silently expanded):
- Group-intent webhook linkage: stripe_session_id='GROUP' means stripeWebhook can't match group intents by id; reconciled ONLY by client confirmOnlinePayment (unchanged). Server-side backstop needs new schema (intent ids on order/side record) — outside approved scope; NOT changed. Reported as blocker.
- Ad-hoc modifier price authority: Deluxe toppings / shake flavors come from client configs (shakeConfig/deluxeConfig), not MenuItem records — cannot server-validate per-unit price; trusted but bounded by subtotal check. Full authority needs server-side config entity.
- Reward discount amount: requires Square loyalty reward-tier lookup to validate exact discount; capped at adjusted subtotal but not exactly validated. Full validation needs server-side reward-tier authority.
- Items without square_item_id (souvenir mug): no MenuItem to validate; price trusted.

NOT TOUCHED (per Part 5): MenuCategoryChips jump (source correct, unverified runtime), item reviews, newsletter, bag-ticket, traveler/rewards terms, SMS outbound confirmed-send gate, other audit findings. No entity records created by builder; only the new ContactMessage schema was added.
