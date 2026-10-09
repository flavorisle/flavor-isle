# Builder report: twilio_sip_trunk_setup_2026-09-28

## Twilio SIP trunk + spare test number + counter-transfer path (Option 2, Twilio half)

**Status:** draft  
**App entity:** BuilderReport `6abb4357151ca45f09971465`

### Before

Twilio half of Option 2 not started: no SIP trunk, no spare test number, no SIP domain, no transfer target, no TwiML for the counter hand-off, and the Live Phone Pipeline switch off pending both console halves.

### After

TWILIO HALF COMPLETE (2026-09-29 04:48 UTC). Created, verified, nothing switched on.

1) ELASTIC SIP TRUNK — FlavorIsle-Smashie-Live
   SID: TK37a808fc672b02f8e4aefdbdafe00f0b
   TransferMode: sip-only  (Twilio rejects other spellings: the allowed set is disable-all | enable-all | sip-only; sip-only is what licenses a SIP REFER from the peer we dial, which is the counter-transfer path)
   Origination URLs: 0 — DELIBERATELY NONE YET.
   Awaiting project id. The exact URI to add the moment Wesley sends it:
     sip:<OPENAI_PROJECT_ID>@sip.api.openai.com;transport=tls
   Added via POST https://trunking.twilio.com/v1/Trunks/TK37a808fc672b02f8e4aefdbdafe00f0b/OriginationUrls with { FriendlyName: 'OpenAI Live SIP', SipUrl, Priority: 10, Weight: 10, Enabled: true }. Nothing to correct afterwards — the trunk is otherwise final. Until it is added, a call to the spare number has nowhere to go.

2) SPARE TEST NUMBER
   +1 270-438-4728 — Bowling Green, KY rate center, 270 area code
   SID: PNf05e373cc707120000bac016d3ac6d92 (bought 2026-09-29 04:48 UTC under the existing Flavor Isle account)
   Attached to the trunk (trunk_sid = TK37a808fc672b02f8e4aefdbdafe00f0b)
   Its own voice_url is null and sms_url is empty — the spare is deliberately silent, so nothing arriving on it can ever be routed into the app's call or message handling.
   NOTE: the account also carries an unused older number, (270) 721-9188, still pointed at demo.twilio.com webhooks and doing nothing. Untouched here. If Wesley would rather not pay for a second spare, that one could be repurposed instead.

3) COUNTER-TRANSFER PATH
   Twilio SIP domain: flavorisle-counter.sip.twilio.com
   SID: SD180a0591d1d62595d837f33e16516e14   SipRegistration: false
   VoiceUrl: https://flavor-isle.com/functions/counterTransferTwiml  (POST)
   REFER target: sip:counter@flavorisle-counter.sip.twilio.com → this exact string is what belongs in the SIP_TRANSFER_TARGET secret (I can declare the secret but cannot type a value into it).
   New file: base44/functions/counterTransferTwiml/entry.ts — dials COUNTER_PHONE_NUMBER with a 20s timeout and answerOnBridge, and when Twilio posts back DialCallStatus the two of us did not connect it speaks a fallback pointing the caller at (270) 563-4618. This file had to exist: a SIP domain with no VoiceUrl would swallow the transferred call instead of dialing the counter.
   Tested: returns 200 with <Dial timeout="20" answerOnBridge="true" action="..."><Number>+12705634618</Number></Dial>, and the same TwiML comes back from https://flavor-isle.com/functions/counterTransferTwiml — the host Twilio will actually fetch.

4) MAIN LINE UNCHANGED — verified by reading it either side of the work
   (270) 563-7230: voice_url https://flavor-isle.com/functions/twilioVoiceRouter, sms_url https://flavor-isle.com/functions/twilioSmsWebhook, status_callback "", trunk_sid null — identical before and after, and it is not on the trunk. It is the only number that is not. The account has no Messaging Services, so inbound SMS rides on the number-level webhook alone and trunking cannot touch it.

STILL OPEN (all deliberately untouched)
   • Origination URI — blocked on Wesley's OpenAI project id.
   • SIP_TRANSFER_TARGET — needs the transfer URI pasted in.
   • SIP domain inbound is unauthenticated: anyone who learns the URI could make Twilio dial the counter. Mitigated only by the domain name being unguessable. Add an inbound check if it is ever abused.
   • SmashieSettings.realtime_sip_enabled stays FALSE and no test call was placed, per instruction.
   • Under SIP the counter off-hook admin alert (today driven by Twilio's dial callback) will not fire — the old dial path no longer exists.

ADDENDUM (2026-09-29, re-verified against live Twilio — no change to the value):
   The REFER target above is CORRECT and unchanged. Paste exactly: sip:counter@flavorisle-counter.sip.twilio.com
   Checked live: domain flavorisle-counter.sip.twilio.com exists (SD180a0591d1d62595d837f33e16516e14), VoiceUrl https://flavor-isle.com/functions/counterTransferTwiml, SipRegistration false. Hostname is the global form — no regional (sip.us1) variant needed; the username 'counter' is arbitrary.
   CREDENTIAL LIST: NOT required. The domain has zero credential-list and zero IP-ACL mappings (call auth, registration auth, and domain-level all empty), so Twilio accepts the REFER'd INVITE for ANY user part and hands it to the VoiceUrl. 'counter' is only a label — nothing needs to register. Adding a credential list would make Twilio demand digest auth on the inbound INVITE, which OpenAI's REFER cannot supply, and would break the transfer. Leave the lists empty.
   REFER format: OpenAI's refer endpoint takes target_uri with a scheme — sip:user@host (or tel:+1...). The scheme is mandatory; a bare counter@flavorisle-counter.sip.twilio.com is not a valid target. The app now adds 'sip:' automatically if it is missing, and reads the address from SmashieSettings.sip_transfer_target first (secret is only a fallback).
   WHAT WAS 'WRONG': only the way the value was being pasted into the secret form (chat rendered it as a mailto/markdown link), never the value itself. Nothing was wrong with the original; no correction to the value is needed.
   Switch stays OFF; no test call placed.
