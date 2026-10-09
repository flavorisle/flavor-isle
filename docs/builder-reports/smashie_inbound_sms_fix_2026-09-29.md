# Builder report: smashie_inbound_sms_fix_2026-09-29

## Inbound texts to Smashie — routing + reply wait

**Status:** applied  
**App entity:** BuilderReport `6abb2e6d15aaa0ade965e972`

### Before

Inbound texts to (270) 563-7230 never reached the app, so Smashie never replied. Root cause was on the Twilio side, not in the app: the number was moved onto the A2P Messaging Service for 10DLC registration, and that service's Inbound Request URL was empty (UseInboundWebhookOnNumber = false), so Twilio dropped every inbound text. The number's own webhook URL (flavor-isle.com/functions/twilioSmsWebhook) was correct but ignored once the Messaging Service handled the number — which is why voice calls kept working (voice is not affected by Messaging Service settings) while texts went silent. Second, latent bug in the app: twilioSmsWebhook read Smashie's reply immediately after posting the message, but the agent's reply lands asynchronously (~4s), so the code found no reply and fell back to the canned greeting instead of answering.

### After

Twilio: Messaging Service MGaec5a9f6d45927317bd4d62930596589 Inbound Request URL set to https://flavor-isle.com/functions/twilioSmsWebhook (POST) — verified set on the account. App: twilioSmsWebhook now waits for Smashie's reply the same way the voice webhook does (polls the conversation up to 40 x 250ms after posting the inbound text), so the customer gets Smashie's actual answer. Verified live: the deployed webhook still returns valid TwiML for keyword replies, and a test conversation returned Smashie's real reply in ~4.1s — inside the 10s wait window. No other behavior changed: consent gates, STOP/HELP/ORDERS/OFFERS keywords, admin auto-reply toggle, and the pay-link flow are untouched.
