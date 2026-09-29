# sip_sideband_crash_fix_2026-09-29

BuilderReport: 6abb770b9b9aaebe7f283737

Evidence: The two latest spare-number calls at 08:26:18 and 08:26:33 UTC were completed by Twilio with seven-second durations, unlike the earlier zero-second failed calls. Each produced a Live session conversation row, proving the incoming webhook and acceptance succeeded. Both rows finalized with zero messages and zero seconds immediately after creation.

Root cause reproduced through an admin-only temporary diagnostic invoking the same sideband helper: "ws does not work in the browser. Browser clients must use the native WebSocket object". The app's catch branch finalized the record and explicitly called hangup. This explains the silent disconnect after successful acceptance; no further trunk or webhook-subscription change was made.

Changes: Replaced npm ws with the worker-native authenticated fetch Upgrade handshake and response.webSocket. The background promise now waits for socket closure and pending transcript writes rather than resolving at socket attachment. Added an explicit session.instructions.append greeting after attaching to the already accepted/running session, following the provider's greeting guidance. Sideband failures now save a failed call status and diagnostic description rather than claiming normal completion.

Checks: Updated incoming handler deploys and rejects an unsigned request with HTTP 400 Invalid signature. The shared helper diagnostic now reaches the provider and returns HTTP 404 for the ended session instead of crashing in the ws constructor. An ended-session 404 does NOT prove a live upgrade, greeting, tools, or sustained call succeeds. The temporary diagnostic was removed. A fresh real call is still required for end-to-end confirmation, including long-call lifetime.

Correction to prior report: SRTP was a documented missing requirement and has remained enabled, but earlier claims that it alone explained every failed INVITE or that absence of an app log conclusively proved edge rejection were stronger than the evidence. The new call records establish progress past acceptance and the reproduced exception identifies the next concrete app-side failure.
