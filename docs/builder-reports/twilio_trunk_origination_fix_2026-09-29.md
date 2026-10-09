# Builder report: twilio_trunk_origination_fix_2026-09-29

## Trunk origination URL correction — OpenAI Live SIP pipeline

**Status:** draft  
**App entity:** BuilderReport `6abb684ed920199ed52ee298`

### Before

The trunk carried an origination URL built from a mistranscribed project id: sip:proj_d7q5f4h1n1s2t4j9e8k7o3p@sip.api.openai.com;transport=tls (SID OUc7b089ff504bd9a96df96f5e257b77f1, enabled, priority 10, weight 10). The id was 28 characters, lowercased and garbled in transit — any call on the spare number would have been offered to OpenAI with a project id that does not exist.

### After

CORRECTED AND CONFIRMED. Deleted the bad entry (SID OUc7b089ff504bd9a96df96f5e257b77f1, HTTP 204; the origination list came back empty), then created the right one: SID OU61e0b73afde8206199e996c5aff738bf, SipUrl sip:proj_d7qhBt1jBr8QYbaaiOJ4hvDg@sip.api.openai.com;transport=tls, Enabled true, Priority 10, Weight 10. Re-read the trunk and its /OriginationUrls list: exactly one entry, byte-for-byte match on the URI, Enabled true. Project id is 29 characters with the capitals preserved, as supplied. Trunk TransferMode still sip-only; attached numbers still +12704384728 only; spare still silent (voice_url null, sms_url empty); main line (270) 563-7230 unchanged (voice_url .../twilioVoiceRouter, sms_url .../twilioSmsWebhook, status_callback "", trunk_sid null). SECRET HUNT: could not be performed — the platform refuses to let a script return app-secret prefixes or lengths at all (that attempt was blocked before it ran), and secret values may not be copied between secrets, so nothing was moved into OPENAI_WEBHOOK_SECRET and it remains the placeholder as instructed. Worth noting for Wesley: the pipeline reads OPENAI_WEBHOOK_SECRET by name, so a code saved under any other name would be invisible to it no matter what. Signature plumbing probed instead: a Standard Webhooks payload signed with the stored value returned 200 {ignored:probe.signature_check} and the same request with a deliberately wrong signature returned 400 Invalid signature — so the verification path works end to end. That does NOT prove the stored value is the console's real code; only a genuine OpenAI delivery can. Pipeline switch still off, no test calls, no toggles, webhook secret untouched.
