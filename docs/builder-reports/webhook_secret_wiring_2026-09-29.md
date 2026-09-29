# Builder report: webhook_secret_wiring_2026-09-29

## OpenAI webhook signing secret — where to paste it, and how to confirm it worked

**Status:** draft  
**App entity:** BuilderReport `6abb6c90eae69d2177cb2807`

### Before

OPENAI_WEBHOOK_SECRET exists in the app but its value cannot be read or verified from the builder side. Live Phone Pipeline (realtime_sip_enabled) is OFF.

### After

WHERE TO PASTE (Wesley does this himself)
  Base44 dashboard → this app → Secrets (environment variables) → the secret named exactly:  OPENAI_WEBHOOK_SECRET
  It already exists — edit it, do not add a new one. Name must match exactly, all caps, underscores, no spaces.
  Value: the signing secret from OpenAI (Platform → Settings → Project → Webhooks → your endpoint). It starts with whsec_ . Paste only that string: no quotes, no trailing space, no extra line.
  Not the OpenAI API key (that is OPENAI_API_KEY — different slot, different value).

SIP_TRANSFER_TARGET CHECK
  The builder tools cannot read secret values, so it could not be compared directly. It does not matter: the app reads the counter address from Admin → Communications (SmashieSettings.sip_transfer_target), verified stored as sip:counter@flavorisle-counter.sip.twilio.com. The secret is only a fallback when that field is blank.

HOW TO CONFIRM THE PASTE WORKED
  1. Wesley says "pasted".
  2. Live Phone Pipeline is switched ON (done by the builder only after that message).
  3. Wesley calls the SPARE number +1 270-438-4728 (never the main line). If Smashie answers, the secret is right.
  4. If the call is busy/silent, check function logs for smashieSipIncoming: "invalid signature" (400) means the secret is wrong or has stray characters; re-paste it.

STATE NOW: pipeline OFF. Main line (270) 563-7230 untouched. No secret value appears in this report.

RESULT — 2026-09-29 (Wesley confirmed the paste; pipeline switched ON)

1. SECRET VERIFICATION — NOT POSSIBLE, and that is a platform limit, not a failed check.
   The builder tools cannot read secret values OR their update timestamps. There is no "secrets" read API and no updated_date to compare. So "confirm OPENAI_WEBHOOK_SECRET was updated recently" cannot be done from here — it was not done, and no result should be inferred from its absence. The only real confirmation is the test call in step 3 below.
   What IS confirmed in code: smashieSipIncoming reads exactly OPENAI_WEBHOOK_SECRET (entry.ts line 201) and verifies every delivery with it (line 209). If the value is absent or wrong, OpenAI's delivery is rejected with HTTP 400 and the call is never accepted. A call that connects = the secret is right. That is the test.

2. SIP_TRANSFER_TARGET — could not be compared either (same limit). Does not matter: the app reads the counter address from SmashieSettings.sip_transfer_target FIRST, and that field was read directly and verified to hold exactly sip:counter@flavorisle-counter.sip.twilio.com. The secret is only a fallback when the field is blank, so the secret's contents are irrelevant to transfers.

3. TOGGLE FLIPPED ON. SmashieSettings.realtime_sip_enabled = true (realtime_sip_enabled was the only change). voice_ordering_enabled was already true. Main line (270) 563-7230 is NOT trunk-attached and is unchanged — it keeps answering through the existing Twilio webhooks exactly as today.

4. SPARE NUMBER IS LIVE FOR THE TEST CALL: +1 270-438-4728.
   Wesley calls it, not the main line.
   Expected if the secret is right: call connects and Smashie speaks.
   Expected if the secret is wrong: call is not answered (busy/silent), and OpenAI's delivery attempts are rejected with 400 invalid signature.

5. HOW THE RESULT GETS CHECKED (rather than streaming logs, which this builder side cannot do):
   A successful accept writes an SmsConversation record with channel='voice', call_sid=<session id>, status='active', transcript populated as Smashie talks, and call_status='completed' at hang-up. So after the call the verification is simply: does a voice SmsConversation exist for the call, and does its transcript contain the greeting? No record at all = the webhook was rejected before accept (secret problem or trunk issue).

OPEN ITEMS TO WATCH ON THE FIRST CALL
   a) GREETING-ON-ACCEPT — UNVERIFIED, and the one thing most likely to need a follow-up fix. The accept payload carries Smashie's instructions but sends no explicit response.create, and the sideband only attaches after accept. Nothing in the code explicitly tells the model to speak first. If the caller hears silence until they say something, that is the cause and it needs a small change.
   b) TOOL-RESULT SHAPE — the code expects a delegation envelope of {event:{type:'response.output_item.done', item:{type:'function_call', name, call_id, arguments}}} and replies with response.item.create + response.create. This shape is unverified against a real call; if Smashie answers menu questions with an error or silence, check the "Live tool call:" and "Live session error event:" log lines.
   c) Counter transfer under SIP is still untested end to end.
   d) The counter off-hook admin alert will not fire under SIP (old dial callback path no longer exists).

NO SECRET VALUE APPEARS IN THIS REPORT. No menu changes, no test orders, main line untouched.
