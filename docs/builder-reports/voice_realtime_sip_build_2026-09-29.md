# Builder report: voice_realtime_sip_build_2026-09-29

## Option 2 build — OpenAI Live SIP pipeline for Smashie's phone line

**Status:** draft  
**App entity:** BuilderReport `6abb419460d5ab2a8f70a773`

### Before

Option 2 scoped (voice_realtime_sip_scope_2026-09-28): move Smashie's phone line onto OpenAI's hosted realtime bridge over SIP. Nothing built yet; console setup outstanding on both sides.

### After

Option 2 BUILT, verified, and switched OFF.

What exists now: smashieSipIncoming (the call endpoint OpenAI will POST incoming calls to) plus four focused modules — openaiWebhookSignature.ts (Standard Webhooks HMAC verification, 5-minute replay window, constant-time compare), openaiLiveApi.ts (accept / reject / refer / hangup plus the sideband WebSocket attach), smashieLivePrompt.ts (Smashie's phone persona, the delegated backend's ordering rules, the six Live tools, and the per-call context block carrying store status, busyness and the caller's Square name/email), and smashieToolRunner.ts (maps each Live tool onto the functions the phone line already uses: logPhoneOrder, deluxeOrderHelper, milkshakeOrderHelper, PhoneMessage, live menu lookups).

Verified by test, not by inspection: a properly signed webhook to the live endpoint returns 200 and reaches the settings gate; the same payload with a tampered signature returns 400 Invalid signature; the app build passes (exit 0); and the function deploys cleanly with the WebSocket client and the platform's post-response runtime in use. No live number, trunk or routing was touched.

Gate: SmashieSettings.realtime_sip_enabled (new field, default FALSE), surfaced as 'Live Phone Pipeline (OpenAI SIP)' in Admin → Communications → Smashie. Until it is switched on the endpoint rejects incoming SIP calls with a busy signal, so the Twilio line keeps answering exactly as it does today.

Remaining before a test call: 1) OpenAI console — enable SIP/GPT-Live for the project and create the webhook (OPENAI_WEBHOOK_SECRET now saved). 2) Twilio — create the Elastic SIP trunk with origination sip:<openai-project-id>@sip.api.openai.com;transport=tls and attach a SPARE test number, leaving (270) 563-7230 alone. 3) SIP_TRANSFER_TARGET once the Twilio SIP domain exists, for counter transfers.

Open items carried forward: the first real call must confirm the greeting fires on accept and that the tool-result event shapes match the current docs; and the counter off-hook admin alert (today driven by Twilio's dial callback) needs a new mechanism under SIP, since a SIP refer leaves Twilio out of the transfer.
