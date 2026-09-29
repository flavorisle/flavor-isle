# voice_sip_blank_call_fix_2026-09-29

Issue #19 — OpenAI Live SIP pipeline, blank-call blocker. Diagnostics-first: read-only Twilio inspection, one unchanged redeploy, no test calls placed. The main line (270) 563-7230, menu, pricing, tickets, persona and voice were not touched.

## 1. Deployed handler — a deploy gap WAS found, and the existing code was redeployed

Local source (`base44/functions/smashieSipIncoming/entry.ts`) is the post-crash-fix code: worker-native fetch-Upgrade sideband attach, explicit `session.instructions.append` greeting after acceptance, and a `finalize()` that **always** writes a `description` and marks a sideband failure `call_status: 'failed'`. The mirrored copy at `flavorisle/flavor-isle` HEAD carries the same markers; the fix landed in commit `daeda4b5` ("Fix Smashie connection crash and remove diagnostic function", 2026-09-29T08:30:29Z) and the file was rewritten again later (13:13Z–13:31Z commits; HEAD blob 14,288 bytes).

Runtime read-back is what settles it. Every Live-session row produced by the only SIP calls ever made was finalized **78–140 ms** after creation with exactly:

| row | created | updated (+ms) | status | call_status | call_duration | messages | transcript | description |
|---|---|---|---|---|---|---|---|---|
| 6abb762b | 08:26:19.025 | 08:26:19.187 (162) | completed | completed | 0 | 0 | [] | absent |
| 6abb7639 | 08:26:33.102 | 08:26:33.232 (130) | completed | completed | 0 | 0 | [] | absent |
| 6abb770b | 08:30:03.754 | 08:30:03.847 (93) | completed | completed | 0 | 0 | [] | absent |
| 6abb772c | 08:30:36.700 | 08:30:36.778 (78) | completed | completed | 0 | 0 | [] | absent |
| 6abb775f | 08:31:27.212 | 08:31:27.352 (140) | completed | completed | 0 | 0 | [] | absent |
| 6abb7844 | 08:35:16.547 | 08:35:16.675 (128) | completed | completed | 0 | 0 | [] | absent |
| 6abb78cd | 08:37:33.355 | 08:37:33.443 (88) | completed | completed | 0 | 0 | [] | absent |
| 6abb7b83 | 08:49:07.804 | 08:49:07.930 (126) | completed | completed | 0 | 0 | [] | absent |

That field set is the **pre-fix finalizer exactly** — the file as of commit `d82ebec0` writes `transcript, last_message_at, message_count, status: 'completed', call_status: 'completed', call_duration` and no `description`. The current finalizer cannot produce it: both of its branches write a `description`, and a sideband failure would have written `call_status: 'failed'`. Conclusion: the calls at 08:30:03 through 08:49:07Z — including every call placed *after* the crash-fix commit — were served by the crashed (pre-fix) build. The earlier "deploy verified" check (unsigned request rejected) does not discriminate between the two builds; both reject an unsigned body with HTTP 400.

Action taken, per the approved scope: the existing code was rewritten **unchanged** — one comment line recording this verification, no logic touched — to force a fresh deploy. Post-redeploy probe of the deployed endpoint: `smashieSipIncoming` with an unsigned `live.transport.incoming` body returned **HTTP 400 `{"error":"Invalid signature"}` in 269 ms** — endpoint live, signature gate on, nothing created. No other code was changed.

## 2. Twilio call records (read-only)

The three target SIDs and everything after 08:34Z, all trunking-originating on the spare trunk, caller +12703208259, destination `sip:proj_d7qhBt1jBr8QYbaaiOJ4hvDg@sip.api.openai.com;transport=tls`:

| CallSid | start (UTC) | end | seconds | status | answered_by | price |
|---|---|---|---|---|---|---|
| CAa099a00025152b50b9c2204e7120f95e | 08:30:03 | 08:30:04 | 1 | completed | null | -0.00340 |
| CA9b0130c14128876104d2b83c7e53c527 | 08:30:36 | 08:31:06 | 31 | completed | null | -0.00340 |
| CAb9627dd340bfc5527c02dfadb9e5f682 | 08:31:27 | 08:31:38 | 12 | completed | null | -0.00340 |
| CA008eb5962fc68903966246091712580a | 08:35:16 | 08:35:17 | 1 | completed | null | -0.00340 |
| CAf074e1b88a74ec1f7ce5c14754623a06 | 08:37:33 | 08:37:44 | 11 | completed | null | -0.00340 |
| CA02b6bf65911836d94d6f1604c367f484 | 08:49:07 | 08:49:14 | 7 | completed | null | -0.00340 |

Earlier trunking calls are visible too (07:47–07:54 failed at 0 s, 07:28–07:41 busy) and the 08:26:18/08:26:33 pair. So from 08:26 onward Twilio was connecting the calls (1–31 s) while the app ended each session in under 150 ms — the dead air the caller heard.

**Codec / SDP evidence is not retrievable.** Voice Insights returns HTTP 404 (20404) for `/Summary` and `/Events` on these SIDs, and the diagnostic read-back `GET https://insights.twilio.com/v1/Voice/Settings` returns `{"advanced_features": false, "voice_trace": false}` — Voice Insights Advanced Features are off for this account, which is why no negotiated codec, SDP offer/answer, SRTP packet counts or disconnect cause exists to read. Monitor Events (Debugger) holds **zero** events for the call SID; the trunk's own event log holds only five `trunk.created` / `trunk.updated` entries, the last at 08:22:56Z — before the blank calls, i.e. no trunk change coincides with them.

Note the 09:14:03Z call `CAaaad5e43bd3773b2e0745d1516baa293` (22 s, to the spare, direction `inbound`, no trunk): that is the legacy Twilio voice path, not SIP (see §4).

## 3. Opus / codec state on the account — not readable, not settable by API

- Twilio's Elastic SIP Trunking codec documentation: trunking is **PCMU + PCMA by default**; **Opus is Limited Availability**, enabled **per account**, and access is requested from a Twilio sales representative — *"If you require any of the Limited Availability codecs for compatibility, contact your Twilio sales representative or talk to Twilio Sales."* (https://www.twilio.com/docs/sip-trunking/codecs)
- There is no API surface for it: the account resource exposes only `auth_token, date_created, date_updated, friendly_name, owner_account_sid, sid, status, subresource_uris, type, uri`; the trunk resource exposes only `account_sid, auth_type, auth_type_set, cnam_lookup_enabled, date_created, date_updated, disaster_recovery_method, disaster_recovery_url, domain_name, friendly_name, recording, secure, sid, symmetric_rtp_enabled, transfer_caller_id, transfer_mode, url`. No codec field exists to read or to write.
- So the account's Opus state is **UNVERIFIED** (unchanged from the previous report), and it cannot be enabled through the API. Enabling it is a documented, reversible *request* to Twilio (ask them to turn Opus on; ask them to turn it off to revert). Left untouched rather than making an unverifiable claim.
- OpenAI's SIP guide (https://developers.openai.com/api/docs/guides/voice-sip): for **inbound** Direct SIP it requires TLS signalling and SRTP for call audio, and states *"SIP negotiates the audio format, so omit `audio.format`"*. The TLS + **Opus** + SDES-SRTP trunk checklist appears only under **Place an outbound call → Configure your trunk**. Nothing in the inbound flow documents Opus as a requirement, so there is no documented basis for changing account-level codecs to fix a blank *inbound* call.
- If Opus is wanted anyway: request it from Twilio sales/support. Even then, codec evidence for a test call still needs Voice Insights Advanced Features (billable, currently off) or a Twilio support case that pulls the SIP ladder.

## 4. Trunk read-back — and a new blocker

`TK37a808fc672b02f8e4aefdbdafe00f0b` "FlavorIsle-Smashie-Live":

- `secure: true` — Secure Trunking (TLS + SRTP) on, as OpenAI's inbound Direct SIP requires.
- Origination URL: `sip:proj_d7qhBt1jBr8QYbaaiOJ4hvDg@sip.api.openai.com;transport=tls`, `enabled: true`, priority 10, weight 10, updated 07:26:56Z.
- `transfer_mode: sip-only` (licenses the REFER for the counter transfer), `transfer_caller_id: from-transferee`, `recording: do-not-record`, `symmetric_rtp_enabled: false` (unrelated to SRTP), `disaster_recovery_url: null`, `auth_type` empty, credential lists 0, IP ACLs 0.
- Created 04:48:57Z, `date_updated 08:22:56Z` — unchanged since before the blank calls.

**BLOCKER: the trunk has no phone number attached.** `GET /v1/Trunks/TK37a808…/PhoneNumbers` returns `[]`, and the spare number `+12704384728` (`PNf05e373cc707120000bac016d3ac6d92`) now reports `trunk_sid: null` with `voice_url: https://taste-isle-express.base44.app/functions/twilioVoiceRouter`, **updated 2026-09-29T09:10:00Z** — 21 minutes after the last blank call. The spare was deliberately moved off the trunk and back onto the legacy Twilio router (its 09:14:03Z call, 22 s, ran that path). Until it is re-attached, **a call to the spare number never reaches OpenAI**, so a test call placed today would exercise the old pipeline and prove nothing about SIP. This was left untouched pending Wesley's say-so; re-attaching is one API call.

For contrast, the main line was read either side of this work and is untouched: `+12705637230` still `voice_url https://flavor-isle.com/functions/twilioVoiceRouter`, `sms_url https://flavor-isle.com/functions/twilioSmsWebhook`, `status_callback ""`, `trunk_sid null`, `date_updated` 21 Sep.

## 5. What the next live test call should prove

Precondition — restore the path first: attach `+12704384728` to `TK37a808fc672b02f8e4aefdbdafe00f0b`. (Not done here; it is a live routing change outside the steps I was given.)

Then, with Wesley calling the spare number himself:

1. A greeting is spoken within a few seconds and **before** the caller says anything ("Hey fam, Smashie here at Flavor Isle…") — proving the sideband attached and the `session.instructions.append` opening ran.
2. The session's `SmsConversation` row (channel `voice`, `call_sid` beginning `live_u`) carries a **`description`** — either "Live session ended normally." or the sideband failure string — and `call_status: 'failed'` if the sideband dropped. Neither field can appear from the old build, so this row alone proves which build served the call.
3. `call_duration` matches the real call length (the old build wrote 0) and transcript turns accumulate *while* the caller is still speaking.
4. Stay on the line 60+ seconds: long-call lifetime was the part the crash fix was never able to prove (no call has run with the fixed build yet).
5. Transfer path: ask for the counter and confirm the REFER lands on `flavorisle-counter.sip.twilio.com` → `counterTransferTwiml` dials COUNTER_PHONE_NUMBER.

If the call is still dead air after that, the row's `description` will now name the failure (sideband attach status/close code) instead of leaving the cause invisible — that is the diagnostic gap this build closes.

BuilderReport: 6abc0d3d077418c2689cc2e8

## Not done / not changed

No test calls placed. No menu, pricing, ticket, persona or voice changes. No trunk, number or account-level setting changed. No code changed except the unchanged redeploy in §1. Media failure, sideband failure and execution-version mismatch are still kept separate: §1 establishes the execution-version gap, §2 confirms Twilio connected the calls, and the codec/SDP side remains unverifiable until Voice Insights Advanced Features (or a Twilio support case) makes it visible.