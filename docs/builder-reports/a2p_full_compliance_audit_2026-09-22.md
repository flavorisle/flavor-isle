# Builder report: a2p_full_compliance_audit_2026-09-22

## A2P/TCPA SMS Compliance Audit (read-only, no changes)

**Status:** draft  
**App entity:** BuilderReport `6ab2b0b411d70398b76cfa99`

### Before

CURRENT STATE (audited 2026-09-22, no code changed):

== SMSSubscriber ENTITY (base44/entities/SMSSubscriber.jsonc) ==
Fields: phone, name, email, opted_in (bool, default true), source (string, default 'website'), status (active|unsubscribed, default active). NO consent timestamp, NO consent category (marketing vs transactional), NO disclosure version, NO page/URL of capture, NO per-message-type flags. opted_in is a single boolean that cannot distinguish marketing consent from transactional/order consent. RLS: create=null (anyone can create), read/update/delete=admin only.

== SMS COLLECTION / CONSENT SURFACES ==

1) CHECKOUT (src/pages/Checkout.jsx lines 165-166, 723-736)
- Phone field: OPTIONAL, unchecked-required=false, not conditioned on purchase. Label 'Phone' (no asterisk). Stored on Order.customer_phone via createPaymentIntent.
- smsConsent checkbox: UNCHECKED by default, OPTIONAL. Copy: 'Text me order status updates from Flavor Isle (confirmed, preparing, ready). Reply STOP to cancel, HELP for help. Msg & data rates may apply. See our Privacy Policy and Terms of Service.' Links to /privacy-policy and /terms-of-service.
- CRITICAL: smsConsent state is NEVER persisted and NEVER passed to createPaymentIntent/createGroupPayment. The checkbox captures nothing. Transactional order texts are later sent by syncSquareOrderStatus to order.customer_phone based ONLY on the global admin toggle smashieSettings.sms_status_updates_enabled — NOT on this per-customer checkbox. So the consent control is cosmetic; texts go out to every phone on an order regardless of the box.
- This checkbox is transactional-only (no marketing language) — good separation intent, but it is non-functional and creates no evidence record.

2) POST-ORDER OPT-IN (src/components/CheckoutSmsOptIn.jsx, on OrderConfirmation)
- Phone + consent checkbox REQUIRED to submit. UNCHECKED by default. Creates SMSSubscriber {opted_in:true, source:'checkout', status:'active'}.
- Copy: 'Get order updates + deals by text?' + checkbox: 'I agree to receive recurring automated order notifications and marketing text messages from Flavor Isle. Consent isn\'t a condition of purchase. Msg & data rates may apply. Reply STOP to cancel or HELP for help. See our Privacy Policy and Terms of Service.'
- BUNDLED: 'order notifications AND marketing' in one checkbox -> this is the 30913 rejection pattern. One consent for two categories.
- No frequency disclosure, no 'recurring' beyond the word 'recurring'. Links are internal app routes, not flavor-isle.com.

3) FOOTER OPT-IN (src/components/FooterSmsOptIn.jsx)
- Phone + checkbox REQUIRED. UNCHECKED by default. Creates SMSSubscriber {opted_in:true, source:'website_footer', status:'active'}.
- Copy: 'Get order status alerts (confirmed, preparing, ready), pay-by-text links, and occasional offers by SMS.' Checkbox: '...agree to receive recurring automated order notifications, payment links, and marketing text messages from Flavor Isle... Consent is not a condition of purchase. Message frequency varies. Msg & data rates may apply. Reply STOP to cancel or HELP for help. See our Privacy Policy and Terms of Service.'
- BUNDLED: transactional (order alerts, payment links) + marketing (offers) in one checkbox.

4) SMS SIGNUP PAGE (src/pages/SMSSignup.jsx)
- Name optional, phone required, checkbox REQUIRED. UNCHECKED by default. Creates SMSSubscriber {opted_in:true, source:'website', status:'active'}.
- Copy: 'Order Updates, Straight to Your Phone' + '...plus occasional offers and specials...Text STOP anytime to opt out.' Checkbox: 'I agree to receive order status notifications, payment links, and occasional promotional offers from Flavor Isle... Msg & data rates may apply. Text STOP to opt out, HELP for help.' Footer links to Terms/Privacy.
- BUNDLED: transactional + promotional in one checkbox. No 'consent not a condition of purchase' on the checkbox itself (only implied). No frequency disclosure.

5) KEYWORD JOIN (base44/functions/twilioSmsWebhook/entry.ts lines 53-66)
- Inbound JOIN/START/YES/etc creates/updates SMSSubscriber {opted_in:true, source:'keyword', status:'active'}. Auto-reply: 'You\'re subscribed! Get order updates, payment links & occasional offers. Msg&data rates may apply. Text STOP anytime to opt out.'
- BUNDLED: order updates + offers in one keyword opt-in. No HELP content in the opt-in reply (HELP handled separately). No Terms/Privacy link possible in SMS (acceptable) but no clear marketing-only opt-in.

6) ACCOUNT / PROFILE (src/pages/Account.jsx)
- Phone field under Personal Information, optional, no consent checkbox, no SMS disclosure. Stored on CustomerProfile.phone. preferred_communication radio includes 'sms' option with no consent language. No SMSSubscriber created here. Phone syncs to Square customer via syncCustomerToSquare.
- No marketing consent captured; phone used for Star Rewards (Square loyalty) and order contact.

7) REGISTER (src/pages/Register.jsx)
- Phone REQUIRED (validated), birthday optional. NO SMS consent checkbox, NO marketing disclosure. Phone saved to CustomerProfile. No SMSSubscriber created. Phone required for account creation -> not a consent, but number is collected.

8) ORDER STATUS PAGE (src/pages/OrderStatus.jsx) - no SMS collection, no consent. OK.

9) STAR REWARDS (src/pages/Rewards.jsx) - no SMS opt-in; references phone for loyalty only. OK.

10) CONTACT (src/pages/Contact.jsx) - email-only form, no phone/SMS. OK.

11) MEET SMASHIE / SmashieChat - promotes texting/calling the restaurant number; no consent capture, no SMSSubscriber creation. Inbound texts handled by twilioSmsWebhook. OK (no outbound marketing without consent).

12) ADMIN - SmsSubscribersList (read-only list), SmsBroadcastPanel (sends marketing broadcast to all active opted_in). Broadcast uses sendSmsBroadcast -> filters {status:active, opted_in:true}. Because opted_in was captured via BUNDLED consent, broadcast effectively sends marketing to people who only wanted order updates -> legal risk.

== SEND FUNCTIONS ==
- sendSmashieSms (shared): generic Twilio REST sender, no category enforcement, no opt-out check. Used by syncSquareOrderStatus (transactional), sendOptInConfirmation (welcome), sendSmsBroadcast (marketing).
- syncSquareOrderStatus: sends transactional order SMS (preparing/ready/completed) to order.customer_phone when smashieSettings.sms_status_updates_enabled. Does NOT check SMSSubscriber opt-out status, does NOT check the checkout smsConsent checkbox. So STOP does not stop order texts; and the checkout checkbox does not gate them.
- sendOrderReadyAlert: admin-triggered, sends to order.customer_phone, no opt-out check.
- sendSmsBroadcast: marketing to all active opted_in. No category field, no suppression of unproven-consent records.
- sendOptInConfirmation: welcome text to new SMSSubscriber (non-keyword). Body: 'You\'re signed up, fam! You\'ll get order status texts, pay-by-text links & occasional offers.' -> BUNDLED welcome.
- twilioSmsWebhook: STOP sets {status:unsubscribed, opted_in:false} (stops marketing only). HELP replies with bundled description. JOIN creates bundled opt-in.

== PRIVACY / TERMS ==
- PrivacyPolicy.jsx 'SMS Consent' section already states non-sharing of mobile/consent data (good for req #5) and frequency (1-4/order + occasional promo). TermsOfService.jsx 'SMS Consent' similarly bundled. Both last-updated Aug 28 2026.
- Consent-surface links are internal React routes (/privacy-policy, /terms-of-service), NOT the flavor-isle.com domain. Contact email inconsistent: hello@flavor-isle.com (Contact) vs hello@flavorisle.com (Privacy/Terms). Published app host is taste-isle-express.base44.app; no confirmed flavor-isle.com custom domain.

== CONSENT EVIDENCE ==
- No timestamp of consent stored. No capture page/URL stored. No disclosure version stored. No consent category stored. Only phone + source + opted_in bool. Fails req #7.

### After

REMEDIATION PLAN (proposal, awaiting Wesley approval — DO NOT IMPLEMENT yet):

=== BLOCKERS (certain rejection / legal risk) ===
B1. BUNDLED CONSENT is the 30913 root cause. CheckoutSmsOptIn, FooterSmsOptIn, SMSSignup, and keyword JOIN each combine transactional (order status, payment links) + marketing (offers/promotions) into ONE checkbox/keyword. Carriers reject this. MUST split into two separate, independent, optional, unchecked controls: (a) Order/transactional updates (optional, not condition of purchase), and (b) Marketing/promotional offers (separate optional unchecked checkbox). Only the marketing checkbox may enroll a customer in marketing.
B2. No CONSENT EVIDENCE retained. SMSSubscriber stores no consent timestamp, page, disclosure version, or category. A2P audits require proof. MUST add fields (see DATA/SCHEMA CHANGES).
B3. sendSmsBroadcast sends marketing to every opted_in subscriber, but opted_in was captured via bundled consent — cannot truthfully attest marketing opt-in. MUST (a) stop marketing broadcasts until records are re-verified, and (b) gate broadcast on a new explicit marketing_consent flag, not the legacy opted_in.
B4. Existing SMSSubscriber records created by the old bundled flow have no proven marketing consent. MUST flag them as not-proven and exclude from marketing until re-confirmed (e.g., a re-opt-in campaign or manual verification).
B5. Transactional order SMS (syncSquareOrderStatus, sendOrderReadyAlert) ignore STOP/opt-out and the checkout checkbox. While transactional messages are generally exempt, on a shared 10DLC campaign STOP must suppress marketing and the campaign must not conflate. At minimum, the checkout smsConsent checkbox must either be wired to a real record or removed; and STOP must be honored for the marketing program (already done) — but the welcome/transactional path should not silently enroll marketing.

=== REQUIRED BEFORE RESUBMISSION ===
R1. Split every consent surface into separate transactional vs marketing controls (see EXACT PROPOSED COPY).
R2. Add consent-evidence fields to SMSSubscriber and persist them on every create (see DATA/SCHEMA CHANGES).
R3. Add a message-category field to all send paths and enforce: marketing sends only to records with marketing_consent=true AND consent_category='marketing'; transactional sends only to order contact and are not conditioned on marketing consent.
R4. Flag legacy bundled records: set marketing_consent=false (unproven) for all existing SMSSubscriber records whose source is in (checkout, website, website_footer, keyword) and created before the split. Exclude from broadcasts.
R5. Make Terms/Privacy links at consent points point to the exact public domain (flavor-isle.com) — confirm the custom domain with Wesley and use absolute URLs https://flavor-isle.com/terms-of-service and https://flavor-isle.com/privacy-policy. If flavor-isle.com is not connected, connect it or use the confirmed canonical domain.
R6. Standardize contact email (hello@flavor-isle.com everywhere) and ensure Privacy non-sharing language explicitly covers mobile numbers + messaging consent data (already present — keep).
R7. Update Twilio campaign description, use cases, sample messages, and opt-in flow to truthfully match the split consent (see TWILIO CAMPAIGN FIELDS).
R8. Wire (or remove) the Checkout.jsx smsConsent checkbox: either persist a transactional consent record on submit, or remove the checkbox and rely on the post-order CheckoutSmsOptIn split. Currently it captures nothing.

=== RECOMMENDED HARDENING ===
H1. Add a consent_version string to each record (e.g., 'a2p-v2-2026-09-22') so future disclosure changes don't invalidate existing proof.
H2. Add consent_text snapshot (the exact disclosure shown) for audit defense.
H3. Add last_marketing_sent_at and last_transactional_sent_at for frequency caps.
H4. sendSmsBroadcast: add explicit category param ('marketing'|'transactional') and a guard that refuses marketing without proven consent.
H5. syncSquareOrderStatus: before sending transactional SMS, check SMSSubscriber status='unsubscribed' for that phone and suppress marketing-only (keep transactional). Document this in the campaign as transactional use case.
H6. Keyword JOIN: reply with a TWO-STEP confirmation — 'Reply MARKETING for offers, or ORDER for order updates only' — and store the chosen category. Avoid single bundled JOIN.
H7. Add a re-opt-in flow for legacy bundled subscribers: send a one-time (transactional) message asking them to reply YES to continue offers; only set marketing_consent=true on explicit reply.
H8. Admin SmsSubscribersList: show consent category, source, timestamp, and a 'proven marketing' badge so Wesley can see who is broadcast-eligible.
H9. Keep the Privacy Policy 'SMS Consent' non-sharing sentence; add an explicit line that marketing requires separate opt-in and is not a condition of purchase.

=== EXACT PROPOSED COPY PER SURFACE ===
-- Checkout (Checkout.jsx) --
Option A (recommended): REMOVE the cosmetic smsConsent checkbox (it is non-functional). Instead, after payment, rely on the post-order CheckoutSmsOptIn split. If kept, relabel to transactional-only and persist a record:
'Text me order status updates from Flavor Isle (confirmed, preparing, ready) about THIS order. Optional — not required to place an order. Msg & data rates may apply. Reply STOP to cancel, HELP for help. See https://flavor-isle.com/privacy-policy and https://flavor-isle.com/terms-of-service'
Do NOT include marketing in this box.

-- Post-order CheckoutSmsOptIn (split into TWO checkboxes) --
Box 1 (transactional, optional, unchecked): 'Send me order status texts (confirmed, preparing, ready) and a secure pay-by-text link for this and future orders from Flavor Isle. Optional and not a condition of purchase. Msg & data rates may apply. Reply STOP to cancel, HELP for help.'
Box 2 (marketing, optional, unchecked, SEPARATE): 'Yes, send me recurring marketing and promotional offers from Flavor Isle. Consent is not a condition of purchase. Message frequency varies (typically a few per month). Msg & data rates may apply. Reply STOP to cancel, HELP for help. See https://flavor-isle.com/privacy-policy and https://flavor-isle.com/terms-of-service'
Only Box 2 sets marketing_consent=true.

-- Footer FooterSmsOptIn (split into TWO checkboxes) --
Box 1 (transactional): 'Send me order status alerts and pay-by-text links from Flavor Isle. Optional, not a condition of purchase. Msg & data rates may apply. Reply STOP to cancel, HELP for help.'
Box 2 (marketing, SEPARATE): 'Yes, send me recurring promotional offers from Flavor Isle. Consent is not a condition of purchase. Message frequency varies. Msg & data rates may apply. Reply STOP to cancel, HELP for help. See https://flavor-isle.com/privacy-policy and https://flavor-isle.com/terms-of-service'

-- SMSSignup page (split into TWO checkboxes) --
Box 1 (transactional): 'Send me order status notifications and payment links from Flavor Isle. Optional, not a condition of purchase. Msg & data rates may apply. Reply STOP to opt out, HELP for help.'
Box 2 (marketing, SEPARATE): 'Yes, send me recurring promotional offers and specials from Flavor Isle. Consent is not a condition of purchase. Message frequency varies (a few per month). Msg & data rates may apply. Reply STOP to opt out, HELP for help. See https://flavor-isle.com/terms-of-service and https://flavor-isle.com/privacy-policy'

-- Keyword JOIN (two-step) --
Reply to JOIN with: 'Flavor Isle: Reply ORDERS for order updates only, or OFFERS for order updates + recurring promotional offers. Msg&data rates may apply. STOP to cancel, HELP for help. flavor-isle.com/terms'
On ORDERS -> consent_category='transactional', marketing_consent=false. On OFFERS -> consent_category='marketing', marketing_consent=true.

-- Welcome (sendOptInConfirmation) --
Transactional-only welcome: 'Flavor Isle: You\'re signed up for order updates & pay-by-text links. Msg&data rates may apply. Reply STOP to cancel, HELP for help.' (Remove 'occasional offers' unless they opted into marketing separately.)

=== DATA/SCHEMA CHANGES (SMSSubscriber.jsonc) ===
Add fields:
- consent_category: enum ['transactional','marketing','both'] — which category they opted into.
- marketing_consent: boolean default false — explicit marketing opt-in (separate from transactional). THIS is the broadcast gate.
- transactional_consent: boolean default false — explicit order-update opt-in.
- consent_timestamp: string date-time — when consent was captured.
- consent_source_page: string — e.g. 'checkout_post_order', 'footer', 'sms_signup', 'keyword_orders', 'keyword_offers'.
- consent_disclosure_version: string — e.g. 'a2p-v2-2026-09-22'.
- consent_disclosure_text: string (maxLength 2000) — snapshot of exact disclosure shown.
- proven_marketing_consent: boolean default false — true only when captured via the new split marketing checkbox or OFFERS keyword. Legacy records start false.
- last_marketing_sent_at: string date-time (optional).
- last_transactional_sent_at: string date-time (optional).
Keep: phone, name, email, opted_in (treat as legacy; keep for backward compat but do NOT use as the marketing gate), source, status.
Migration: set proven_marketing_consent=false and marketing_consent=false for ALL existing records (unproven) until re-confirmed.

=== SEND-LOGIC CHANGES ===
- sendSmsBroadcast (entry.ts): change filter to {status:'active', proven_marketing_consent:true, marketing_consent:true}. Add required param category='marketing'. Refuse to send if category!=='marketing' or no proven consent. Log last_marketing_sent_at.
- sendSmashieSms (shared): add optional category param; for marketing, require a passed-in proven flag (enforced by caller). Keep generic for transactional.
- syncSquareOrderStatus: keep transactional sends to order.customer_phone gated on smashieSettings.sms_status_updates_enabled; BEFORE sending, look up SMSSubscriber by phone — if status='unsubscribed', suppress marketing but KEEP transactional (transactional use case). Add category='transactional' to the send. Do NOT enroll marketing.
- sendOrderReadyAlert: add category='transactional'; no marketing.
- sendOptInConfirmation: send transactional welcome only; body must not promise offers unless marketing_consent true.
- twilioSmsWebhook STOP: set status='unsubscribed', marketing_consent=false, opted_in=false (stops marketing). Keep transactional order-contact permission separate (do not erase). JOIN: implement two-step ORDERS/OFFERS as above.
- Checkout.jsx: either remove smsConsent or persist a transactional_consent record on submit (pass to createPaymentIntent and store).

=== TWILIO CAMPAIGN FIELDS / SAMPLE MESSAGES ===
Campaign description (proposed): 'Flavor Isle sends transactional order-status updates (confirmed, preparing, ready, completed) and payment links to customers who provided their phone number for a specific order. Separately, customers who explicitly opt into marketing receive recurring promotional offers (a few per month). Marketing opt-in is captured via a separate, optional, unchecked checkbox and is never a condition of purchase. Opt-out: STOP. Help: HELP. flavor-isle.com/terms'
Use cases: (1) Customer care / conversational (order status, payment links) — 2-way; (2) Marketing / promotions — only to proven marketing opt-ins.
Sample message 1 (transactional): 'Flavor Isle: Order #1234 is READY, fam! Slide through 103 N Main St, Smiths Grove whenever you\'re ready. Questions? (270) 563-4618'
Sample message 2 (transactional): 'Flavor Isle: Hey Jane! Order #1234 is locked in — the crew\'s firing the grill now. We\'ll text you the second it\'s ready.'
Sample message 3 (marketing, only to proven opt-ins): 'Flavor Isle: Hey fam! Today only — 2 for $1 shakes after 8pm. Tell the crew at the counter. Reply STOP to opt out.'
Opt-in flow description: 'Customer provides mobile number on the website checkout, footer, or /sms-signup page. For order updates, an optional unchecked 'order updates' checkbox is offered (not required to order). For marketing, a SEPARATE optional unchecked 'promotional offers' checkbox is offered; only checking that box enrolls marketing. Keyword JOIN returns a two-step choice (ORDERS or OFFERS). Consent timestamp, source page, disclosure version, and category are retained per subscriber. STOP unsubscribes from marketing; transactional order messages for active orders continue under the customer-care use case.'

=== WHAT SHOULD REMAIN UNCHANGED ===
- The Privacy Policy non-sharing language for mobile/consent data (req #5) — keep.
- The transactional order-status SMS content/timing logic in syncSquareOrderStatus (milestones, catch-up emails) — keep.
- Star Rewards / Square loyalty phone-keyed behavior — keep (not SMS marketing).
- The admin SmsBroadcastPanel UI and SmsSubscribersList UI (only add columns/guards).
- All non-SMS flows (checkout, payments, cart, rewards, merch) — untouched.
- The Smashie chat/voice/SMS conversational inbound handling (customer-care use case) — keep, but ensure outbound marketing is never sent from chat.

=== APPROVAL ===
This is a read-only audit and proposal. No code, data, settings, workflows, or main were changed. Awaiting Wesley's see-first approval before any modification. Status set to 'draft' (schema has no 'proposal' enum value; 'draft' = awaiting review).
