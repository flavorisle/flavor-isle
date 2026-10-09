# Builder report: twilio_sms_reply_fix_2026-09-28

5 items in this batch.

## StatusCallback added to the conversational reply send

**Status:** applied  
**App entity:** BuilderReport `6aba5d87ecc02d274c5f2777`

### Before

No StatusCallback on the reply.

### After

StatusCallback=https://flavor-isle.com/functions/twilioSmsStatus is sent with the reply, so undelivered/failed replies get recorded.

---

## Verification — deployment, live credential probe, code check

**Status:** applied  
**App entity:** BuilderReport `6aba5d87ecc02d274c5f2779`

### Before

(not verified)

### After

1) twilioSmsWebhook invoked live: 200 in 222ms returning an empty TwiML Response — the function now loads, so the npm:twilio module error is gone. 2) Live Twilio REST probe using the app's real credentials returned Twilio validation error 21265 (bad To number) rather than 401/20003 — proving Basic auth was accepted and the request shape is valid; nothing was sent. 3) Code check: zero remaining twilio() / npm:twilio / messages.create references in the webhook; StatusCallback present in both files.

---

## Confirmed untouched — consent, keywords, routing, voice, menu/pricing/kitchen

**Status:** applied  
**App entity:** BuilderReport `6aba5d87ecc02d274c5f277a`

### Before

unchanged

### After

unchanged

---

## sendOrderReadyAlert — same StatusCallback added

**Status:** applied  
**App entity:** BuilderReport `6aba5d87ecc02d274c5f2778`

### Before

sendTwilioSms posted only From, To and Body.

### After

sendTwilioSms now also posts StatusCallback=https://flavor-isle.com/functions/twilioSmsStatus, so "order ready" delivery failures are recorded too.

---

## twilioSmsWebhook — conversational reply send (root cause)

**Status:** applied  
**App entity:** BuilderReport `6aba5d87ecc02d274c5f2776`

### Before

Reply sent with the Twilio npm SDK (npm:twilio@5.3.3, twilioClient.messages.create). That SDK throws "Unsupported cache mode: default" under Deno; the throw was caught by the outer handler, which returned an empty TwiML Response — so any non-keyword text (e.g. "hey", "Place a order") silently got NO reply.

### After

The npm:twilio import and the client are gone. The reply now goes out over the Twilio REST API with fetch — POST https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json, Basic auth from TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN, form params From=TWILIO_PHONE_NUMBER, To=customer's From number, Body=replyText — the same pattern sendOrderReadyAlert already used.
