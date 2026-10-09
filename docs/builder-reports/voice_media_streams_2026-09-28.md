# Builder report: voice_media_streams_2026-09-28

## Feasibility gate — Twilio Media Streams streaming pipeline on Base44

**Status:** draft  
**App entity:** BuilderReport `6abb353125e4deae3c6a5db4`

### Before

Wesley approved Option B (GitHub issue #19): rebuild Smashie's call leg as a live streaming pipeline (Twilio Media Streams + OpenAI Realtime, 'verse' voice) for sub-second responses, replacing the current gather / LLM / TTS loop. First step was a feasibility gate before any build.

### After

FEASIBILITY GATE RESULT: NOT FEASIBLE inside Base44 as-is. (1) Backend functions cannot accept a WebSocket upgrade — the platform refused a probe function at deploy time with "Deno.upgradeWebSocket is not available in backend functions", so a Twilio Media Streams / ConversationRelay bridge cannot live in a function. (2) Base44 Actors are Durable-Object WebSocket rooms but a connection requires a platform-minted connection token fetched by the Base44 SDK client (POST /apps/{appId}/actors/{actor}/connection-token) plus the SDK's own socket transport and heartbeats — Twilio cannot mint that token or perform that handshake, and actors hibernate after ~10s of quiet even with clients attached. MEASURED BASELINE (live, 2026-09-29): ~6.4s per turn = ~1.0s gather silence + 3.2s agent brain + 2.9s TTS first byte (smashieTts buffers the whole MP3). Streaming the same 'verse' voice direct from OpenAI measured 2.26s to first byte — real but only ~0.7s of the gap. OPTIONS FOR WESLEY (nothing external created, nothing built): (1) Base44-only optimization — keep gather loop, agent brain and persona unchanged; nest <Play> inside <Gather> for true barge-in, admin-tunable end-of-speech window starting at 500ms, streamed 'verse' TTS → ~4.5-5.5s/turn, not sub-second. (2) OpenAI Realtime over SIP via Twilio <Dial><Sip> — OpenAI hosts the bridge, sub-second speech-to-speech, 'verse' is a valid Realtime voice, function calling covers logPhoneOrder/transfer/message tools; needs owner approval plus a scoping pass on tool calls, transcripts, transfer and closed-store rules. (3) External WebSocket relay outside Base44 — exact fidelity to Option B and genuinely sub-second, but new external infrastructure, forbidden without explicit owner permission. BLOCKED ON Wesley's pick. Constraints honored: no voice/model substitution, no persona change, no menu/pricing/kitchen changes, no test orders, current gather pipeline left fully intact as fallback.
