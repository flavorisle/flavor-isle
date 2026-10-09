# Builder report: spare_number_sip_diag_2026-09-29

**Status:** applied
**App entity:** BuilderReport `6abb73b743d0a1b03980b77b`

READ-ONLY DIAGNOSTIC — no calls placed, no trunk/secret/toggle/settings changed. Times UTC (CT = UTC-5). Requested window 02:40-02:55 CT = 07:40-07:55 UTC.

HOW THE CALLS APPEAR: Filtering Twilio calls by To=+12704384728 returns nothing — the spare number's calls show as trunking-originating legs on trunk TK37a808fc672b02f8e4aefdbdafe00f0b ("FlavorIsle-Smashie-Live", number +12704384728 attached) from the caller +12703208259 to sip:proj_d7qhBt1jBr8QYbaaiOJ4hvDg@sip.api.openai.com;transport=tls. So Twilio DID receive and DID send every INVITE to OpenAI's edge.

CALL ATTEMPTS (SID | start | setup-to-end | Twilio status | call duration):
- CA08abeff31abc7524b60b9d7fa38cf4ec | 07:33:31 | ~1s | busy | 0   (before window)
- CAbddbb584a133abd01e3e4699ead076dc | 07:41:10 | ~1s | busy | 0
- CAa65c4f693c9dd836bc9e66540bfbe34d | 07:47:19 | ~3s | failed | 0
- CA63cfc2163c4146f19d880df5357581de | 07:47:24 | ~3s | failed | 0
- CA0ea5dc001fa6eaa871107e27cf473ccf | 07:48:19 | ~2s | failed | 0
- CA553cea0edfa307075bb8e26c2fbd4e36 | 07:48:23 | ~3s | failed | 0
- CA48e40d1067717c2186ee3e8b2e5adcdf | 07:50:16 | ~2s | failed | 0
- CA21295714fd417bb7f2361600e072bbed | 07:50:21 | ~2s | failed | 0
- CA1a6cb0df4d401520b2503f0f831de416 | 07:54:41 | ~3s | failed | 0   (AFTER the webhook secret was verified)
(Unrelated: CAb41a1b85a89429c8a27803f283cf8d99, 07:33:38, +12703208259 -> main line +12705637230, inbound, completed 215s — legacy Twilio path, main line untouched.)
Each failed attempt repeats about 5s later (the caller/carrier retrying).

EXACT SIP RESPONSE CODE: NOT AVAILABLE from anything I can read. Voice Insights Summary/Events returned 404 for every SID (not enabled/processed for this account), the call resources carry no SIP code, Twilio Monitor Alerts for 07:25-08:10 UTC is empty, and no call Notifications exist. Twilio only exposes the mapped status. Reading it exactly needs the Twilio Console: Voice > Manage > Calls > (SID) > Call Insights / SIP diagnostics, or the trunk's Debugger.

WHAT THE STATUSES SAY:
- "busy" (07:33, 07:41): Twilio maps SIP 486/600/603 to busy, fast (~1s). The app's own handler rejects with 486 when the Live pipeline or voice ordering is OFF. So these are consistent with OpenAI having delivered the webhook and the APP answering "busy" (toggle was not yet on / secret unverified) — OR OpenAI rejecting outright. Dashboard Logs for smashieSipIncoming settle it: a "Rejected call ... live pipeline off" line at ~07:33 and ~07:41 means OpenAI delivered.
- "failed" (07:47-07:54): ~2-3s, price 0, not busy/no-answer. Consistent with a non-486 error final response (4xx/5xx) or a setup failure, e.g. the app returning 400 Invalid signature / 502 Accept failed so the INVITE was never accepted. The 07:54:41 attempt happened after the secret was confirmed, so a signature problem alone does not explain it.

TRUNK STATE (read only): origination URL correct and enabled (project proj_d7qhBt1jBr8QYbaaiOJ4hvDg, TLS, priority 10); transfer_mode sip-only; recording off; secure = false (SRTP/secure media is NOT enabled on the trunk). OpenAI's SIP edge may require encrypted media — a hypothesis to check against OpenAI's SIP docs, NOT changed here.

VERDICT: Twilio -> OpenAI INVITEs are being sent and refused/failed within 1-3s; they are not silently dying before OpenAI. Cannot yet tell "OpenAI rejected the INVITE" from "OpenAI accepted then our webhook path failed". Decisive next reads (dashboard only): (1) smashieSipIncoming Logs 07:33-07:55 UTC — no rows = OpenAI never delivered a webhook (SIP enablement/project issue, matching a reject at the edge); rows with {"ignored":...}, "Invalid signature" or "Accept failed" = OpenAI delivered and the app path is the problem; (2) OpenAI dashboard webhook delivery log for the same window; (3) Twilio Call Insights for CA1a6cb0df4d401520b2503f0f831de416 for the exact SIP code.
