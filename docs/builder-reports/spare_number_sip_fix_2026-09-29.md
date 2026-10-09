# Builder report: spare_number_sip_fix_2026-09-29

**Status:** applied
**App entity:** BuilderReport `6abb756e7891c6fde50a5963`

FIX PASS — root cause found and two blockers cleared. One console-side check remains.

EVIDENCE (read-only, before changes):
- SmashieSettings.realtime_sip_enabled = true and voice_ordering_enabled = true, updated 07:46:19 UTC — i.e. BEFORE the 07:47-07:54 failed calls. The app's own gate was NOT rejecting them.
- Twilio trunk TK37a808fc672b02f8e4aefdbdafe00f0b ("FlavorIsle-Smashie-Live"): origination sip:proj_d7qhBt1jBr8QYbaaiOJ4hvDg@sip.api.openai.com;transport=tls (enabled), transfer_mode sip-only, and secure = FALSE — no SRTP media encryption.
- OpenAI's GPT-Live SIP guide (developers.openai.com/api/docs/guides/voice-sip, Direct SIP): "SIP signaling uses TLS, and GPT-Live requires SRTP for call audio." The outbound section repeats it: use a trunk with TLS signaling, Opus audio and SDES-SRTP. A trunk that offers plain RTP fails at OpenAI's SIP edge, BEFORE the webhook is ever dispatched.
- That matches the observed pattern exactly: Twilio sent every INVITE; each leg ended in 1-3s with 0s call duration; no webhook reached the app. The same symptom (Twilio Elastic SIP Trunk -> sip.api.openai.com, failed/0s, no realtime.call.incoming or live.transport.incoming dispatched) is a recurring, documented OpenAI-side issue in their developer forum ("failing again before webhook dispatch", "inbound calls never trigger the webhook"), where OpenAI staff confirmed an incident and shipped a fix. So if the trunk fix below does not clear it, the remaining suspect is OpenAI's SIP ingress, not our code.
- App-side audit against the same guide: the accept body shape ({ session: { type, model, instructions, audio.output.voice, delegation } } to POST /v1/live/sessions/{session_id}/accept), reject ({ status_code }), refer ({ target_uri }), hangup, and the sideband URL (wss://api.openai.com/v1/opus... /v1/live/sessions/{session_id}/attach) all match the documented GPT-Live flow, and HANDLED_EVENTS already covers live.transport.incoming plus the deprecated live.call.incoming as the guide requires.

CHANGED:
1. Twilio trunk TK37a808fc672b02f8e4aefdbdafe00f0b: Secure = true (SRTP + TLS). Verified by read-back (before: false, after: true). Reversible with one call. This is the documented media requirement GPT-Live was missing.
2. smashieSipIncoming: sip_headers are now read in the documented shape (an array of { name, value } pairs) with From ranked first — previously the array was walked as a key/value map, so caller ID was only recovered by an accidental fallback. Affects caller name/email context and where the payment link is texted.
3. smashieSipIncoming: every webhook arrival is now logged with its event type and data.type, so "OpenAI never dispatched" and "the app received an event it does not handle" stop looking identical in the logs. Deploy verified: a test POST still returns 400 Invalid signature in 170ms (gate intact, no crash).

STILL CONSOLE-SIDE (cannot be read or set with the app's key):
- OpenAI project: confirm GPT-Live / SIP support is enabled for project proj_d7qhBt1jBr8QYbaaiOJ4hvDg and that the project's webhook endpoint is subscribed to live.transport.incoming (plus the deprecated live.call.incoming while legacy retries drain). A webhook subscribed only to a Realtime event type would never receive a GPT-Live inbound call.

NEXT TEST: call the spare number +12704384728, then read the logs for "Live webhook ..." — a line there means OpenAI dispatched and the trunk fix worked; no line means the INVITE is still being refused at OpenAI's edge.
