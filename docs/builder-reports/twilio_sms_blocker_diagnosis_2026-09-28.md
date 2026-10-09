# Builder report: twilio_sms_blocker_diagnosis_2026-09-28

## Twilio SMS blocker diagnosis — read-only (Sep 28)

**Status:** applied  
**App entity:** BuilderReport `6abb37dd3b91d0dc4844f3fa`

### Before

Reported symptom (Wesley, Sep 28): SMS not delivering BOTH ways — no reply text received, and his inbound texts supposedly never reach the webhook. Voice works fine. Instruction: read-only Twilio REST check, no code/workflow/config changes, no test messages, file findings only.

### After

RAW FINDINGS (all queries read-only, nothing modified).

1) ACCOUNT: http 200 — friendly_name 'Flavor Isle', status ACTIVE, type Full. Balance $24.1253 USD. No suspension, no messaging hold.

2) MESSAGES.
- To +12703038259 (his 22:53 CT test reply): SM2de703f9f81f35870cab72842482632e, created 2026-09-29T03:53:15Z, status UNDELIVERED, error 30005 'Unknown destination handset', 1 segment, body 66 chars. It is the ONLY message ever sent to that number in the account's history — the handset is not deliverable.
- To +12703208259: delivered 03:49:44Z, 03:50:10Z, 03:50:27Z, 03:50:44Z (all outbound-api, 1 segment, 66 chars each) plus 03:22:55Z outbound-reply (2 segments, 200 chars, sent via the Messaging Service = Twilio's own keyword auto-reply) and 02:46:26Z (4 segments, 524 chars). Only ONE payment-link text tonight: 2026-09-29T02:46:26Z = 21:46 CT, DELIVERED. There is NO message record at ~21:41 CT (02:41Z) to that number or any number — that send left no trace at Twilio.
- Inbound (direction inbound, status 'received') from +12703208259: 03:15:58Z, 03:16:11Z, 03:22:39Z, 03:22:54Z, 03:49:41Z, 03:49:54Z, 03:50:07Z, 03:50:24Z, 03:50:41Z (9 tonight; history back to Aug 15). Twilio IS receiving his texts.
- Other errors tonight: 21211 at 03:18:44Z (invalid 'To' +15550009998), 30006 x3 at 02:36:26Z / 02:36:31Z / 02:38:52Z ('Landline or unreachable carrier', to +1270555012x numbers).

3) ALERTS/DEBUGGER (last 30): codes are 30005 x1 (03:53:17Z), 21211 x1 (03:18:44Z), 30006 x3 (02:36-02:38Z), 21265 x1 (2026-09-28T12:28:48Z), and 21x 30034 spanning 2026-09-21T17:16Z to 2026-09-24T18:46:24Z. NO 11200 / 11210 (inbound webhook retrieval failure) alerts at all — Twilio is not failing to reach the webhook. The 30034 A2P blocks stop on Sep 24.

4) 10DLC A2P: brand BN527a43b7a490a0ff3c5d12fcc146d418 status APPROVED, identity_status VERIFIED (updated 2026-09-03T13:41:59Z). Campaign CWCEBGH on Messaging Service MGaec5a9f6d45927317bd4d62930596589: campaign_status VERIFIED (created=updated 2026-09-24T20:48:01Z), use_case MIXED, is_externally_registered false, errors []. Nothing SUSPENDED or EXPIRED. Messaging Service 'created on June 10 2026 16:34 UTC': use_inbound_webhook_on_number false, us_app_to_person_registered true, status_callback https://flavor-isle.com/functions/twilioSmsStatus.

5) NUMBER: (270) 563-7230 = +12705637230, status in-use, capabilities sms true / mms true / voice true. sms_url https://flavor-isle.com/functions/twilioSmsWebhook (POST) — correctly pointed. voice_url https://flavor-isle.com/functions/twilioVoiceRouter (POST) — matches voice working. That Messaging Service's inbound_request_url is the SAME twilioSmsWebhook, so inbound routing is correct on both paths. (A second number, (270) 721-9188, still has demo.twilio.com URLs — unrelated to Flavor Isle.)

6) THE ACTUAL BLOCKER (app side, evidence): every delivered reply to +12703208259 is EXACTLY 66 characters, and the saved Smashie greeting in SmashieSettings is exactly 66 characters — so twilioSmsWebhook took its timeout fallback (settings.greeting) on every inbound; Smashie's real answer never resolved. Cross-check in the app DB: the phone +12703208259 has 30 SmsConversation rows and ALL are channel 'voice'; zero channel 'sms' rows exist for it (the only 2 'sms' rows belong to tonight's manual webhook tests: 03:18:43Z and 03:53:17.600Z). The voice row for that number has last_message_at 2026-09-29T03:50:44.457Z — the exact timestamp of the last SMS reply — proving the SMS path is logging into and reading back the existing VOICE conversation record for that phone, then polling a voice conversation for an assistant text reply that never arrives.

ONE-LINE CONCLUSION: Nothing is blocked at Twilio (account active, brand APPROVED, campaign VERIFIED since Sep 24, number correctly pointed at the webhook, balance fine) — inbound texts DO reach the webhook and replies DO send, but the SMS path binds to that phone number's existing VOICE conversation record, so Smashie's answer never resolves and the customer receives only the 66-char fallback greeting; separately, the 22:53 CT test to +12703038259 bounced with 30005 'Unknown destination handset' because that number cannot receive SMS.

NO FIX ATTEMPTED — diagnosis only, as instructed. Awaiting Wesley's decision on next step.
