# Builder report: newsletter_get_updates_2026-09-24

## 'Get Updates from the Isle' newsletter (double opt-in + admin composer + SMS form fix)

**Status:** approved  
**App entity:** BuilderReport `6ab546f449875d2479d7db02`

### Before

No real email newsletter system existed (the prior /newsletter page was a single-opt-in stub using a throwaway NewsletterSubscriber entity). There was no double opt-in, no admin composer, no unsubscribe flow, and no delivery logging. SMS signup forms (footer, checkout) showed a status message rather than hiding entirely for logged-in customers who already had both proven consents.

### After

New EmailSubscriber entity (email, status pending/active/unsubscribed, confirm_token, source, subscribed_at, unsubscribed_at, unsubscribe_token) + NewsletterSend delivery-log entity (broadcast_id, subscriber_id, email, status, error, sent_at). Footer 'Get Updates from the Isle' email signup on every page (FooterEmailSignup) creates a pending subscriber and sends a double opt-in confirmation email via Resend — nothing is active until the confirm link is clicked (/confirm-subscription page calls confirmEmailSubscription). Every newsletter email includes a one-click unsubscribe link (/unsubscribe page calls unsubscribeEmail, sets status unsubscribed + timestamp). Admin-only NewsletterComposer on the Email Campaigns admin page (AdminEmails): subject + body editor, send-test-to-self button (prefilled with the admin's email), live active-subscriber count, and a final confirm before send; sends to active subscribers only via sendNewsletterBroadcast with per-recipient NewsletterSend delivery logging and content-hash idempotency (broadcast_id = hash of subject+body) so a subscriber never receives the same newsletter twice. Deleted the throwaway NewsletterSubscriber entity; the /newsletter page now uses the same double-opt-in system. NO auto-enrollment from orders, profiles, or any existing data. No A2P/SMS changes. Item 4f: FooterSmsOptIn and CheckoutSmsOptIn now hide entirely (return null) for logged-in customers with both proven consents; partial consent still shows only the missing-consent form; re-enrollment after STOP already works end-to-end (unsubscribed status -> form shows -> upsertSmsConsent reactivates status to active) and was verified. The dedicated /sms-signup page keeps its 'You're all set' confirmation (the form itself is hidden) rather than rendering a blank page. All four backend functions tested. /reviews, homepage, and checkout untouched — regression-free.
