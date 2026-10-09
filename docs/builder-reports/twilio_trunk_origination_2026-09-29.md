# Builder report: twilio_trunk_origination_2026-09-29

## Twilio trunk origination URL — OpenAI Live SIP pipeline

**Status:** draft  
**App entity:** BuilderReport `6abb66c0b45f2bfc7ccad109`

### Before

Trunk built and verified on the previous pass with ZERO origination URLs — nothing for a call arriving on the spare number to reach, so the SIP pipeline could not have worked yet.

### After

ORIGINATION URL SET AND CONFIRMED by re-reading the trunk: sip:proj_d7q5f4h1n1s2t4j9e8k7o3p@sip.api.openai.com;transport=tls — SID OUc7b089ff504bd9a96df96f5e257b77f1, Enabled: true, Priority: 10, Weight: 10. The trunk is now complete: TransferMode sip-only, attached numbers +12704384728 only, spare still silent (voice_url null, sms_url empty), main line (270) 563-7230 byte-identical to before (voice_url flavor-isle.com/functions/twilioVoiceRouter, sms_url flavor-isle.com/functions/twilioSmsWebhook, status_callback "", trunk_sid null). OPENAI_WEBHOOK_SECRET deliberately untouched — the value saved there is not the real signing secret and the console value has not arrived. CHARACTER COUNT FLAG: the project id Wesley sent is 28 characters, not the 29 he quoted — worth confirming before the test call that no character was dropped in transit, since a wrong id fails silently at OpenAI. SIP_TRANSFER_TARGET still unset pending the value being pasted; realtime_sip_enabled still false; no test call placed, no toggle flipped.
