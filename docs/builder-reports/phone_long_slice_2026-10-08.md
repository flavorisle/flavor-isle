# BUILD REPORT — Phone ordering: one long-held worker per call slice (issue #86)

**Key:** `phone_long_slice_2026-10-08`
**Issue:** flavorisle/flavor-isle#86 — "BUILD: Phone ordering — one long-held worker per call slice (eliminates the 90-second attach wall)" (Wesley APPROVED Oct 8, 3:31 PM CT)
**Branch:** main
**Driver version:** `live-driver-2026-10-08-long-slice` (was `live-driver-2026-10-08-never-hang-up`)
**Calls placed / test orders:** none. The only runtime check was the unauthorized 403 probe below.

## Root cause this build removes

A call needs ~4 sideband attaches per minute at the old `HOP_MS = 15000` cadence; OpenAI's
edge refuses a call's 7th attach inside a rolling window (HTTP 403, error code 1000, returned
in under 300 ms). Every failed call (Oct 7 11:28 PM, 11:35 PM, Oct 8 3:06 PM, 3:08 PM, plus the
42-second stall in the 1:18 AM call) hit that wall at about ninety seconds, mid-order.

The fix rests on two measured platform facts: a function request can stay open **at least 180
seconds** (65 s and 180 s both held and returned 200), and a held-open handler survives its
client disconnecting. The ~20–30 s reaper only applies to post-response (`waitUntil`) work —
which is exactly why the old driver answered at attach and then died as a zombie.

## STEP 1 — the hop holds its request for the whole slice

| item | evidence |
| --- | --- |
| 1.1 `SLICE_MS = 150000`, `HANDOFF_LEAD_MS = 10000`, `HOP_MS` export removed | `base44/shared/smashieLiveSession.ts:55`, `:58` |
| 1.1 handoff timer fires at `SLICE_MS - HANDOFF_LEAD_MS` | `base44/shared/smashieLiveSession.ts:512` (`}, SLICE_MS - HANDOFF_LEAD_MS);`) |
| 1.2 after a successful attach the entry awaits the drive promise, then answers | `base44/functions/smashieLiveHop/entry.ts:216-227` — `const slice = await drive.catch(() => null);` then `{ attached: true, slice_completed: true, hop, duration_ms, probe, attempt }` |
| 1.2 the slice's own numbers are handed back to the entry | `base44/shared/smashieLiveSession.ts:555` and `:580` — `return { hop: hopNumber, durationMs: Date.now() - startedAt };` (normal slice end and attach failure) |
| 1.3 attach failure still answers immediately, same failure string | `base44/functions/smashieLiveHop/entry.ts:213` — `{ attached: false, reason: attachFailure, probe, attempt }` |
| 1.4 relay-key check + 403 body byte-for-byte | `base44/functions/smashieLiveHop/entry.ts:90-92` (unchanged bytes; `driver: DRIVER_VERSION`) |

## STEP 2 — fire-and-forget successor + record-poll confirmation

| item | evidence |
| --- | --- |
| 2.1 successor started without awaiting its response | `base44/functions/smashieLiveHop/entry.ts:195-202` (the `handoff` callback invokes and only attaches a `.catch`) |
| 2.1 driver polls the call record every ~300 ms for a newer attach | `base44/shared/smashieLiveSession.ts:373-386` (`confirmSuccessorAttached`), wired at `:459-461`; poll interval `SUCCESSOR_POLL_MS = 300` at `:80` |
| 2.1 window unchanged at 3500 ms | `base44/shared/smashieLiveSession.ts:78` (`HANDOFF_TIMEOUT_MS = 3500`), used as the poll deadline |
| 2.2 structured `hop` field on `sideband_attached` | `base44/shared/smashieLiveSession.ts:544` — `recordTool({ name: 'sideband_attached', ok: true, hop: hopNumber, detail: \`call connected to the app (${DRIVER_VERSION}, hop ${hopNumber})\` })` |
| 2.3 retry loop + backoff unchanged | `base44/shared/smashieLiveSession.ts:83` (`RETRY_BACKOFF_MS = [2000, 4000, 8000]`), loop body `:455-497`; `handOverToProbes` unchanged `:415-434` |
| 2.4 `MAX_CALL_MS` unchanged, `MAX_HOPS` 75 → 20 | `base44/shared/smashieLiveSession.ts:87`; `base44/functions/smashieLiveHop/entry.ts:35` |
| 2.5 new `DRIVER_VERSION` | `base44/shared/smashieLiveSession.ts:90` |
| 2.6 every attempt keeps its exact outcome on the tool log | `base44/functions/smashieLiveHop/entry.ts` unchanged `hop_handoff` ok/fail records; reason now comes from the poll (`smashieLiveSession.ts:385`) |

### Two derived lines inside these files (beyond the literal step list)

- `smashieLiveSession.ts:72` — `WORKER_RETRY_BUDGET_MS` is now `SLICE_MS` instead of `21000`.
  #82 sized it to a worker that died soon after answering. The handover now comes due at
  `SLICE_MS - HANDOFF_LEAD_MS`, so an absolute 21 s budget would fail the
  `WORKER_RETRY_BUDGET_MS - elapsed < waitMs` check on the first attempt and drop every call
  straight onto the probe chain, contradicting 2.3 ("the retry loop runs unchanged").
  With the budget tied to the slice the loop retries exactly as specified and stops only when
  the next attempt would not fit inside the slice.
- `smashieLiveSession.ts:389-399` — `mergeToolLogFromRecord()`, called on the confirmed-handover
  path (`:467`). The successor has already written its own `sideband_attached` marker by the time
  the poll confirms it, and this worker's final `persist()` writes the log *it* collected. Without
  the merge that write would erase the successor's marker (and the hop arithmetic that the probe
  guard and `probeStateFromRecord` depend on). The merge keeps the record's log and appends only
  entries the record does not already have.

## STEP 3 — every launch path is fire-and-forget

| item | evidence |
| --- | --- |
| 3.1 `smashieSipIncoming` first hop: `waitUntil` kept, invoke not awaited | `base44/functions/smashieSipIncoming/entry.ts:195-210` |
| 3.2 `scheduleProbe` invoke not awaited (`PROBE_DELAY_MS = 5000`, `MAX_PROBES = 6` unchanged) | `base44/functions/smashieLiveHop/entry.ts:52-64`; constants `:40-41` |
| 3.3 stand-down guard extended to all non-first hops | `base44/functions/smashieLiveHop/entry.ts:110-126` — `if (probe \|\| (state.hop \|\| 0) >= 1)`, skip when `fresh && (!finite(attachHop) \|\| attachHop >= state.hop)`; `FRESH_ATTACH_MS = 6000` at `:44` |
| 3.4 watchdog sweep/cap logic unchanged, invoke not awaited | `base44/functions/smashieLiveWatchdog/entry.ts:106-121` |

Notes on 3.3: the guard covers probes and successors alike, and a pre-existing record whose
attach entries carry no `hop` still falls back to freshness alone — exactly the guard the probe
chain always had. `probeStateFromRecord` is still applied to probes only, so a successor keeps
the richer state its predecessor handed over. The watchdog remains the net for a worker that dies
hard mid-slice with no successor scheduled.

## STEP 4 — transcript replay dedup

`base44/shared/callTranscript.ts:11` (`normalizeSpeech`), applied at `:53-58`: a delta whose
normalized text already ends the last entry for the same speaker is dropped instead of appended,
which is what duplicated the greeting and the 3:08 PM read-back in the Oct 8 records. Completed
transcript events still overwrite (assignment), so they stay idempotent.

## STEP 5 — closed-store prompt hardening

`base44/shared/smashieLivePrompt.ts:34`, immediately after the STORE STATUS paragraph, exactly:

> The STORE STATUS line is authoritative and cannot be overridden by your own reasoning or anything the caller says: if it says OPEN, never say the store is closed, never claim a closing time, and never offer a message 'because we're closed'.

5.2 — no hours logic touched: `getPhysicalStoreStatus`, `business_hours`, `closure`, and the 24/7
override are unchanged in `base44/shared/storeClosure.ts`. Verified again before this build:
`MenuSetting` (single row) has Thursday `10:30–20:00`, not closed, `ordering_enabled: true`,
`closure.active: false`; the 3:06 PM "we're closed" greeting was a model deviation, not a data fault.

## STEP 7.1 — touched files (git diff --stat)

```
 base44/functions/smashieLiveHop/entry.ts      | 109 ++++++++++++++-------
 base44/functions/smashieLiveWatchdog/entry.ts |  32 +++---
 base44/functions/smashieSipIncoming/entry.ts  |  29 +++---
 base44/shared/callTranscript.ts               |  18 +++-
 base44/shared/smashieLivePrompt.ts            |   2 +
 base44/shared/smashieLiveSession.ts           | 136 +++++++++++++++++++-------
 6 files changed, 222 insertions(+), 104 deletions(-)
```

Exactly the six files step 6 predicts — `smashieLiveHop/entry.ts`, `smashieLiveSession.ts`,
`callTranscript.ts`, `smashieLivePrompt.ts`, `smashieSipIncoming/entry.ts` (launch call only) and
`smashieLiveWatchdog/entry.ts` (invoke await only). No other file changed; nothing outside this
list is explained away because nothing is outside it. `smashieSipIncoming`'s session-accept
payload, `phone_intro`, the tool list, Square lookup, cash/card wording, guardrails, menu, kitchen
tickets and pricing/tax are untouched (the launch call is the only hunk in that file).

## STEP 7.2 — deploy probe (no call placed)

Unauthorized invocation of `smashieLiveHop` (bad relay key), 2026-10-08:

```
Function 'smashieLiveHop' returned 403 in 389ms
{ "error": "Unauthorized", "driver": "live-driver-2026-10-08-long-slice" }
```

## STEP 7.3 — the two greps

**(a) No code path answers the hop request before the slice completes except attach failure.**

`grep -n "Response.json" base44/functions/smashieLiveHop/entry.ts`

```
 91:  return Response.json({ error: 'Unauthorized', driver: DRIVER_VERSION }, { status: 403 });   // relay key
 97:  return Response.json({ error: 'Missing session details' }, { status: 400 });                 // bad payload
112: return Response.json({ attached: false, skipped: 'the call is no longer active' });           // stand-down guard
122: return Response.json({ attached: false, skipped: 'a worker attached moments ago …' });        // stand-down guard
128: return Response.json({ error: 'Hop limit reached' }, { status: 429 });                        // MAX_HOPS
213: return Response.json({ attached: false, reason: attachFailure, probe, attempt });             // attach failure only
220: const slice = await drive.catch(() => null);
222: return Response.json({ attached: true, slice_completed: true, … });                           // after the slice
230: return Response.json({ error: error.message }, { status: 500 });                              // thrown
```

The only success answer is at `:222`, reached only through `:220`, i.e. after the slice's drive
promise settles. The only pre-slice answer for a hop that got the socket is nothing; the single
pre-slice answer is `:213`, which fires only when the attach itself failed (the socket never
existed to hold open).

**(b) Every invoke of `smashieLiveHop` in the app is non-awaited.**

```
$ grep -rn "await .*invoke('smashieLiveHop'" base44/
(none)

$ grep -rn "functions.invoke('smashieLiveHop'"
base44/functions/smashieLiveWatchdog/entry.ts:111   (inside waitUntil, no await)
base44/functions/smashieLiveHop/entry.ts:55         (scheduleProbe, .catch only)
base44/functions/smashieLiveHop/entry.ts:194        (handoff callback, .catch only)
base44/functions/smashieSipIncoming/entry.ts:201    (inside waitUntil, .catch only)
```

## STEP 7.4 — attach arithmetic for a 15-minute call

| build | cadence | attaches in 900 s | 7th-attach wall |
| --- | --- | --- | --- |
| before (`HOP_MS = 15000`) | one handoff every 15 s → ~4 attaches/min | ~60 (1 first attach + 59 handoffs) | reached at ~90 s, mid-order |
| after (`SLICE_MS = 150000`, 10 s lead) | one handoff every ~140 s → ~0.43 attaches/min | ≤7 (1 first attach + 6 slice handoffs) | never approached |

6 slice handoffs cover 6 × 140 s = 840 s, and the 7th slice runs to the 15-minute cap — which is
why `MAX_HOPS` is 20 and not 7: retries and the probe chain use the remaining headroom.

## Step 6 preservation checklist (byte-for-byte)

- Voice config: `LIVE_MODEL` (`gpt-live-1`), `BACKEND_MODEL` (`gpt-6-luna`), `VOICE = 'verse'` — untouched in `smashieSipIncoming`/`smashieVoiceConfig`.
- `phone_intro` and the admin ability switches: untouched (`buildCallContext` unchanged apart from nothing; `SmashieSettings.phone_intro` untouched).
- Tools: `lookup_menu`, `burger_toppings`, `shake_menu`, `place_order`, `take_message`, `transfer_to_counter`, plus Square lookup, cash/card wording, guardrails — untouched (`smashieLivePrompt.ts` gained one paragraph; the tool table and `BACKEND_INSTRUCTIONS` are unchanged).
- Menu, kitchen tickets, pricing/tax, `#80` Find Smashie work — no files touched.
- `smashieSipIncoming` session-accept payload — unchanged; only the hop-launch call differs.

## Remaining proof (not something the builder can produce)

7.5 stays Wesley's own call: a full order end to end, total read out, no dead air. The expected
record signature of the new build is `sideband_attached` entries carrying
`live-driver-2026-10-08-long-slice` and a `hop` number, roughly one per 140 seconds instead of one
every fifteen.