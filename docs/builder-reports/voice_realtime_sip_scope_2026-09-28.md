# Builder report: voice_realtime_sip_scope_2026-09-28

## Option 2 scope — OpenAI realtime SIP bridge for Smashie's phone line

**Status:** draft  
**App entity:** BuilderReport `6abb391a3b91d0dc4844f529`

### Before

Option 2 selected (Sep 28): migrate Smashie's phone line off the current Twilio gather → LLM → TTS loop (~6.4s per turn: 1.0s waiting for silence, 3.2s thinking, 2.9s before his voice starts) onto OpenAI's hosted realtime bridge reached over SIP, for sub-second turns while keeping his voice and our order/transfer/message tools. Standing blocker on record: the Base44 runtime cannot host inbound WebSocket upgrades, which is what had ruled out any relay we host ourselves.

### After

SCOPING RESULT — Option 2 is technically viable on this platform, with console-side setup still outstanding.

PLATFORM FEASIBILITY — PROVEN (probe, since deleted). A temporary backend function opened an outbound wss:// socket and held it while sending and receiving: 40s window → opened in 359ms, 4 messages echoed, no drop; then 100s window → opened in 285ms, 12 messages echoed, no drop, function returned 200 at 100.4s. OpenAI's SIP flow requires exactly this "sideband WebSocket" (wss://api.openai.com/v1/live/sessions/{id}/attach) for transcripts, tool calls and commands — so the design can run entirely on-platform, with NO external relay or outside infrastructure. Note this is the outbound-client case; the earlier finding about inbound wss upgrades being unsupported still stands and is not needed here. Remaining unknown: behaviour on calls much longer than ~2-3 minutes and one socket per concurrent call.

WHAT THE OPENAI DOCS REQUIRE (Direct SIP): provider (Twilio) exchanges call audio with OpenAI directly — our app never touches audio, it only (1) receives a project webhook for live.transport.incoming / legacy realtime.call.incoming, verifies the signature and dedupes, (2) accepts the call with POST /v1/live/sessions/{session_id}/accept carrying instructions, voice and delegation mode, (3) attaches the sideband socket, and (4) ends with POST .../hangup, or transfers with POST .../refer { target_uri }. Steps 1, 2 and 4 are ordinary HTTP calls a backend function can make — confirmed feasible.

ACCOUNT CHECKS. OpenAI: key valid; realtime models reachable (gpt-realtime-2.1, gpt-realtime-2, gpt-realtime-1.5, gpt-realtime-mini, gpt-audio-*). The PROJECT ID cannot be read with this key (GET /v1/organization/projects = 403, key is not admin-scoped) and GPT-Live/SIP enablement cannot be confirmed from here — both must come from the OpenAI console. Twilio: trunking API responds (200) but the account has ZERO SIP trunks and ZERO SIP domains, so Elastic SIP Trunking is not set up at all. Twilio documents that the same number can serve SIP trunking and Messaging, so the SMS path on (270) 563-7230 should survive — must be verified at cutover.

GATES BEFORE ANY CUTOVER (console-side, needs Wesley): 1) OpenAI project — enable SIP/GPT-Live for the project, create the webhook endpoint, hand over the project ID and webhook secret. 2) Twilio — create an Elastic SIP trunk with origination URI sip:<openai-project-id>@sip.api.openai.com;transport=tls. 3) Attach a SPARE test number to the trunk first and leave (270) 563-7230 exactly as it is (working voice + the SMS webhook we just diagnosed) until a test call proves the whole loop. 4) Counter transfer — with audio on OpenAI's side Twilio can no longer <Dial> the counter, so the transfer becomes a SIP refer to a target URI, which needs a Twilio SIP domain/trunk on our side to receive the REFER and dial COUNTER_PHONE_NUMBER.

REWORK IN SCOPE. The three Smashie tools (logPhoneOrder, deluxeOrderHelper, milkshakeOrderHelper) move from Base44 agent tools to Live tools driven over the sideband; Smashie's persona/instructions move into the session config; the admin transcript (SmsConversation rows) must be written from sideband events instead of the webhook; the phone-number STORE STATUS / CALLER INFO context lines move into session context. SMS ordering and the whole SMS path are untouched by this work.

OPEN ITEMS: cost pass (OpenAI audio billed per input+output audio minute, plus Twilio Elastic SIP Trunking per-minute fees — materially different from the current gather+TTS cost profile) and the concurrency/long-call behaviour noted above. No production voice code was changed in this pass; the probe function was deleted.
