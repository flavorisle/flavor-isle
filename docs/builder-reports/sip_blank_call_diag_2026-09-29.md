# Spare-number blank-call investigation

## Scope
Read-only inspection of trunk and calls first. No telephone calls placed. Main phone line, routing, trunk settings, voice configuration and application code were not changed during this investigation. Findings do not establish that media failure is the cause.

## Caller-reported timeline (America/Chicago, UTC minus 5)
- 02:41: busy, gate reportedly off.
- 02:47: two rings then disconnect.
- Approximately 03:29: answer then immediate hang-up.
- 03:31: connected dead air, no greeting or response.
These are caller reports, not exact provider timestamps.

## Current trunk evidence
GET Twilio trunk TK37a808fc672b02f8e4aefdbdafe00f0b returned HTTP 200.
- Name: FlavorIsle-Smashie-Live.
- secure: true. Secure Trunking (TLS/SRTP) is ON.
- last updated: 2026-09-29T08:22:56Z (03:22:56 Central), before the blank calls.
- symmetric_rtp_enabled: false. This is separate from SRTP; it is not evidence of missing encryption and was not changed.
- transfer_mode: sip-only.
- recording: do-not-record.
- Enabled origination route: sip:[PROJECT_ID_REDACTED]@sip.api.openai.com;transport=tls, priority 10, weight 10.
The trunk resource does NOT expose an enabled-codec list or negotiated SDP. Consequently Opus presence is UNVERIFIED, not absent and not confirmed.
Twilio's codec documentation says PCMU/PCMA are default, while Opus is Limited Availability and must be enabled on the account; when enabled, it is offered first. There is no documented Opus toggle in the inspected trunk response to safely patch.
Source: https://www.twilio.com/docs/sip-trunking/codecs
OpenAI's SIP guide requires SRTP for Direct SIP. Its explicit TLS/Opus/SDES-SRTP trunk checklist is in the outbound-call section; that wording alone does not prove an inbound call negotiated no usable codec.
Source: https://developers.openai.com/api/docs/guides/voice-sip

## Provider call timeline (exact UTC)
- CAa099a00025152b50b9c2204e7120f95e: 08:30:03–08:30:04, completed, duration 1 second.
- CA9b0130c14128876104d2b83c7e53c527: 08:30:36–08:31:06, completed, duration 31 seconds.
- CAb9627dd340bfc5527c02dfadb9e5f682: 08:31:27–08:31:38, completed, duration 12 seconds.
All three are trunking-originating calls on the spare trunk. Twilio completed status establishes connection completion, not audible media or a functioning assistant.
GET Voice Insights Summary for the 31-second call returned HTTP 404/code 20404. No negotiated codec, SDP offer, SRTP packet counts, RTP receive/send metrics or disconnect cause was recovered. A 404 does not establish a codec failure or an outage.

## Acceptance configuration: SOURCE inspection, not recovered wire logs
Current app source sends POST /v1/live/sessions/{session_id}/accept with top-level session:
- type: live
- model: gpt-live-1
- instructions: VOICE_INSTRUCTIONS plus per-call STORE STATUS/BUSYNESS/CALLER/CHANNEL context; caller details omitted from this report.
- audio: { output: { voice: marin } }
- delegation.type: responses
- delegation.responses.model: gpt-6-luna
- delegation.responses.instructions: BACKEND_INSTRUCTIONS plus the same per-call context.
- delegation.responses.tools: lookup_menu, burger_toppings, shake_menu, place_order, take_message, transfer_to_counter, using the source-defined function schemas.
- delegation.responses.tool_choice: auto
- audio.format is omitted because SIP negotiates the audio format.
This reports exact configured model/voice/delegation values, but must NOT be presented as the exact historical request captured for the 03:31 call.

## What acceptance and sideband evidence establishes
Conversation rows exist for these accepted Live sessions:
- 08:30:03.754Z: live_u1_ETNVpp3oMdsOYGxbP6SX2X56sNSPQt23, row 6abb770b87c72c58c265a709.
- 08:30:36.700Z: live_u7_ETNWLp3oMqy9xkiRROaogups0ayJLo05, row 6abb772ca725839614768b14.
- 08:31:27.212Z: live_u7_ETNXBp3oMVfbQW85pFiqCiWw2TPVAYlw, row 6abb775f94f42d6184d4e589.
In the inspected handler, these records are created only after accepted.ok is true. That supports successful acceptance (a 2xx response), rather than an accept-side 502, but the exact HTTP status and response body were not retained in those records. Do not substitute the documented 200/empty-body behavior for a captured historical response.
Each row was marked completed less than 200 ms after creation, with call_duration 0, message_count 0, transcript [] and no description, even though the provider calls lasted 1–31 seconds. This is a material discrepancy: the current finalizer always writes a description and distinguishes failed sideband closure. It is consistent with older execution or another writer, but neither is proven from these records. Do not claim that the current sideband fix or greeting ran on the 03:31 call.
No session.started, reflected audio, input/output transcript events, sideband errors, or greeting acknowledgment were recovered for these calls. Empty transcript storage is NOT proof that OpenAI received no media.

## Greeting mechanism
Current source first accepts the session, creates the conversation, and starts driveLiveSession in waitUntil. After attachLiveSideband resolves, it sends:
{ type: session.instructions.append, delegation_id: null, content: 'Greet the caller now in English: Hey fam, Smashie here at Flavor Isle! Follow the STORE STATUS in your context, then offer the help allowed by that status. Begin immediately, then pause and listen.' }
The greeting is an explicit sideband instruction, in addition to the opening guidance in the session instructions. The transport uses an authenticated native fetch Upgrade handshake to the existing session's /attach endpoint. No separate response.create is used to start the voice greeting; response.create is used only to continue delegated tool work.
Whether this instruction was SENT, ACKNOWLEDGED or SPOKEN for the 03:31 call is UNVERIFIED. The source does not persist a separate greeting-sent marker, so it cannot be reconstructed from the existing conversation row.
Source: https://developers.openai.com/api/docs/guides/live-conversations (Greet before the caller speaks).

## Historical-log access limitation
No historical function-log tool was available in this session. Base44 documentation recommends the authenticated CLI logs command with --env prod, but the CLI was not installed in the workspace; the attempted no-install invocation timed out and the binary check confirmed absence. No package was installed and no platform credentials were requested. Therefore this report does not claim to contain accept-side runtime logs. Those remain available through the app's Logs dashboard, subject to retention/access.

## Decision and remaining checklist
No additional trunk or session configuration was changed: SRTP was already enabled, Opus state is unverified, and there is no established configuration defect to patch safely from the evidence obtained.
1. Obtain the actual SIP offer/answer and RTP/SRTP metrics for the listed call SIDs; confirm offered/negotiated Opus or other compatible codec and both directions of media.
2. Correlate historical production logs with the listed Live session IDs to determine running handler version, exact accept status/body, attach result, first event/error and closure cause.
3. Establish whether the sideband greeting command ran and was acknowledged on the 03:31 session.
4. If Opus is required and not enabled, confirm Twilio account-level availability through Twilio before changing the approved architecture.
The blank call remains unresolved; media failure, sideband failure and execution-version mismatch must not be conflated.


BuilderReport: 6abb781f736047cda77570ce
