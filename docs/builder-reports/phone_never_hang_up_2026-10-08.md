# BuilderReport — Phone ordering: never hang up on the caller (issue #82)

**Date:** 2026-10-08 (prepared 06:10 UTC)
**Issue:** [#82 — BUILD: Phone ordering reliability redesign - never hang up on the caller (Wesley APPROVED Oct 7 2026)](https://github.com/flavorisle/flavor-isle/issues/82)
**Base:** current `main` @ `57d97a8` (contains `232b948`'s handoff-reason logging; this build supersedes its `MAX_HOP_FAILURES=5` cap and its 900 ms retry delay)
**Scope guardrails honoured:** no menu changes, no kitchen-ticket changes, no pricing/tax changes, **no test calls and no test orders**. Find Smashie (issue #80) branch untouched — all work is on `main`.

---

## Why this build: the hang-up path removed

Both real calls on Oct 7 (11:28 PM and 11:35 PM CT) died at ~41 s. Hops 1–6 attached (~200 ms each), then three handovers were refused in under 120 ms each, and then the app itself called `POST /v1/live/sessions/{id}/hangup` — `runHandoff()` → `endCall(..., true)` → `hangupLiveSession`. The app hung up on the caller mid-order. That path is now gone.

---

## STEP 1 — the hang-up-on-handoff-failure path is removed (`base44/shared/smashieLiveSession.ts`)

| Spec | What changed | Where (after) |
| --- | --- | --- |
| 1.1 delete the fallback-speech + `endCall(..., true)` after `MAX_HOP_FAILURES` | Deleted. `runHandoff()` now ends by handing the call to the probe chain instead of ending the call. | L445–449 |
| 1.2 delete `MAX_HOP_FAILURES` | Removed entirely (was L48). No cap on handover attempts is left anywhere. | — |
| 1.3 unbounded successor retries, backoff 2s → 4s → 8s → 8s…, every attempt logged with the hop's own refusal reason | Loop rewritten: `while (!finalized && !handedOff && !recoveryHandedOver)`, no attempt cap; `RETRY_BACKOFF_MS = [2000, 4000, 8000]` (L55) indexed by attempt so the tail repeats at 8 s; each `hop_handoff` entry carries the reason string returned by the hop worker (`failures.push(...)` L431/L433, recorded L436). | L399–449 |
| 1.4 only (a) caller hang-up / session-closed, (b) `MAX_CALL_MS`, (c) an admin stop flag may end a call | After this build there is exactly **one** `hangupLiveSession` call site in the whole pipeline: `endCall(..., true)` reached only from the `MAX_CALL_MS` check in `runHandoff` (b) — `smashieLiveSession.ts` L341, called from L402–403. Conditions (a) are handled without hanging up: `session.closed` → `finalize()` (L309–317), sideband close → `finalize()` (L461–482). No admin stop flag exists in the pipeline, and nothing else may hang up. Verified by `grep -rn hangupLiveSession base44 src`. | L341 (only site) |
| 1.5 near end-of-life with no successor → never hang up: mark `needs_reattach`, log `worker_lifetime_no_successor`, schedule ONE probe ~5 s out | `handOverToProbes()` (L355–371): records `worker_lifetime_no_successor` (`ok:false`, detail = every attempt's reason, L357), sets `recoveryHandedOver`, `queue(persist({ needs_reattach: true }))` (L360), awaits the write, calls `onNoSuccessor(hopState())` (L364), then closes its own socket and finishes its slice. `onNoSuccessor` lives in the hop entry and schedules the probe via `waitUntil` (see STEP 3). Retries stop before this only when another attempt would not fit in the worker's life: `WORKER_RETRY_BUDGET_MS = 21000` (L60) vs 15 s hop + backoff (L440). | L355–371, L440 |

**A handoff failure can no longer end a call** — the old code's `appendSpeakableNote("My bad fam, I'm losing the line here…")` + `endCall(..., true)` is deleted.

---

## STEP 2 — hop cadence tied to worker lifetime (`smashieLiveSession.ts`)

| Spec | Change | Where |
| --- | --- | --- |
| 2.1 `HOP_MS` 6000 → 15000 | `export const HOP_MS = 15000;` with the reasoning recorded in the comment (5–15 s of margin before the 20–30 s platform reclaim; 2.5× fewer attaches). | L46–49 |
| 2.2 keep `HANDOFF_TIMEOUT_MS 3500`, zero-gap handover, `handledCallIds` single-owner guard | Unchanged: `HANDOFF_TIMEOUT_MS = 3500` (L64); successor-confirms-then-old-detaches sequence untouched (L411–424); `handledCalls`/`state.handledCallIds` untouched (L83). | L64, L411–424 |
| 2.3 keep instant transcript persistence | Unchanged: first-caller-words flush (L276–281), `PARTIAL_SAVE_MS = 1000` partials, per-segment saves. | unchanged |

---

## STEP 3 — re-attach probe chain (`base44/functions/smashieLiveHop/entry.ts`)

| Spec | Change | Where |
| --- | --- | --- |
| 3.1 return the exact OpenAI HTTP status + error body | `openaiLiveApi.ts` now throws `Live sideband upgrade failed — HTTP ${status}: ${detail}` (L90–96); the hop hands that string back as `reason` (L193) and the previous hop writes it into `tool_log` verbatim. | `openaiLiveApi.ts` L90–95; hop L197 |
| 3.2 `probe:true` drives the call from persisted state; on failure schedule the next probe +5 s via `waitUntil`, up to 6; then stop, set `needs_reattach`, never hang up | `MAX_PROBES = 6`, `PROBE_DELAY_MS = 5000` (L33–34); `scheduleProbe()` (L41–62) sleeps 5 s then invokes `smashieLiveHop` with `probe:true, probeCount:n`; `onNoSuccessor` schedules probe #1 (L135–148); `onProbeFailure` chains to `n+1`, and past 6 appends `reattach_probe_exhausted` and leaves `needs_reattach: true` for the watchdog (L150–171). `probeStateFromRecord()` rebuilds transcript / `tool_log` / `startedAt` / hop count from the record so the probe resumes the same call (shared module L526–541). | hop L33–62, L135–171; session L526–541 |
| 3.3 probes idempotent per conversation | A probe reads the record first (L97–108): exits with `skipped` when the call is no longer `active`, and when a `sideband_attached` marker is younger than `FRESH_ATTACH_MS = 6000` (L37, L105) — a worker that just attached owns the call. Single-owner tool guard (`handledCallIds`) still applies inside the driver. | hop L97–108 |

---

## STEP 4 — watchdog safety net (new)

* **Function:** `base44/functions/smashieLiveWatchdog/entry.ts` (new).
* **Workflow:** `base44/workflows/Smashie Live Watchdog.jsonc` (new) → `invoke_backend_function: smashieLiveWatchdog`.
* 4.2 each run lists `SmsConversation` where `channel='voice'` and `status='active'` (L54–58), keeps only Live (SIP) calls (L35–39), skips records written within `STALE_MS = 20000` (L91), skips any call with a `reattach_probe` or `sideband_attached` marker newer than `PROBE_MARKER_MS = 10000` (L23–26, L98–101), and spawns ONE `probe:true, probeCount:1` invoke for each remaining call (L105–120).
* 4.3 it **never hangs up**: no `hangupLiveSession`/session calls at all. Its other job is `status='completed'`, `call_status='completed'`, `description='closed by watchdog at 15-minute cap'`, `needs_reattach:false` for records older than `MAX_CALL_MS` (imported from the shared driver, L20, L76–87).
* 4.4 web-app changes: none — a function plus a schedule, exactly as specified.
* **Auth:** the scheduled path carries no user token (like the app's other scheduled sweeps), so a signed-in caller hitting it by hand must be `admin`; a non-admin user gets 403 (L47–50). A `dryRun:true` payload reports what it *would* probe/close without touching a call — used for the serving check below.

### Watchdog schedule interval actually configured

**Every 5 minutes** — `cron_expression: "*/5 * * * *"`, `timezone: "America/Chicago"`, `schedule_mode: "recurring"`, `ends_type: "never"`.

The pre-plan asked for 1 minute *or the platform minimum, recorded in the report*: the platform's minimum scheduled interval is **5 minutes** (the workflow authoring guide states "every 5 minutes → `*/5 * * * *` (minimum interval)"), so 5 minutes is what is configured. Consequence, stated plainly: the watchdog is a **safety net, not the fast path** — the 15 s hop cadence plus the 6-probe/~30 s re-attach chain do the immediate recovery, and a call that lost every socket and exhausted its probe chain waits at most one sweep for the next re-attach attempt. **The caller is never hung up while waiting.**

---

## STEP 5 — instrumentation

* 5.1 `DRIVER_VERSION = 'live-driver-2026-10-08-never-hang-up'` (L74), written into every `sideband_attached` entry, and returned in the hop's 403 body so a deploy is verifiable without a call.
* 5.2 every attach failure logs the exact status + body: `attach_failed` (`smashieLiveSession.ts` L509) carries the hop's message including `HTTP <status>: <error body>`; the hop's `reason` carries it back to the previous hop, which records it on the `hop_handoff` failure entry (L436).
* 5.3 `232b948`'s handoff-reason logging kept; its `MAX_HOP_FAILURES=5` logic and 900 ms retry replaced as specified (STEP 1).

---

## STEP 6 — preservation checklist (git-verified untouched)

`git diff --stat` for this build touches exactly four files: `base44/entities/SmsConversation.jsonc` (+5 lines: the `needs_reattach` field), `base44/shared/smashieLiveSession.ts`, `base44/shared/openaiLiveApi.ts` (5 lines), `base44/functions/smashieLiveHop/entry.ts`, plus the two new files (watchdog function, workflow). Therefore, byte-for-byte unchanged:

* Voice config — `smashieSipIncoming/entry.ts` L36–38: `gpt-live-1`, `gpt-6-luna`, `VOICE = 'verse'` (file not modified at all).
* `smashieLivePrompt.ts` (prompt, tools `lookup_menu` / `place_order` / `transfer_to_counter` + square lookup), `smashieAdminContext.ts` (`phone_intro` unchanged — `SmashieSettings.jsonc` L14 untouched), cash/card wording, never-take-card-numbers guardrail, turn cap, closed-store/busyness logic, blocked contacts, `smashieToolRunner.ts`, counters transfer `refer`, message taking, SMS toggles, `smashieFastGreeting` path, dedupe guards (`handledCallIds`, `logPhoneOrder` call-id dedupe), TOA/relayKey checks — **all in files this build never modified**.
* Greeting rule preserved and extended: only the first hop greets (`greeting: probe || state?.hop ? '' : greeting`, hop L131) so a re-attached call is never re-introduced.

---

## STEP 7 — deploy + verification performed

1. **Deploy:** all files written to `main` and committed (this workspace *is* the deployed app; the platform serves `main`). Find Smashie branch untouched.
2. **Serving check — unsigned probe only, no test calls:**
   * `smashieLiveHop` with no payload → **403** `{"error":"Unauthorized","driver":"live-driver-2026-10-08-never-hang-up"}` — proves the **new build is the one serving** and that the relay-key guard still rejects unsigned callers.
   * `smashieLiveWatchdog` `{"dryRun": true}` → **200** `{ok:true, probed:[], finalized:[], skipped:[], active_scanned:0}`.
   * `smashieLiveWatchdog` `{}` → **200** `{ok:true, dry_run:false, probed:[], finalized:[], skipped:[], active_scanned:0}` — the real scan ran end-to-end. **0 active voice calls existed at that moment**, so nothing was probed and no call was touched.
   * Workflow `Smashie Live Watchdog` → status **active**, no runs yet (5-minute schedule).
   * Static checks: all four modified/new TypeScript files parse; `grep -rn hangupLiveSession base44 src` returns one call site (the 15-minute cap).
3. **No test calls were placed.** No test orders were placed. Wesley's next real call is the acceptance test.
4. **What a passing call record will show (7.4):** `sideband_attached` (with `live-driver-2026-10-08-never-hang-up`) roughly every 15 s; rising hop numbers; **zero app-initiated hangups**; caller turns saved instantly; `lookup_menu` / `place_order` entries; the payment flow; a natural ending via caller hang-up or the 15-minute cap. If any attach is refused, its exact OpenAI status + reason appears on `hop_handoff` (`ok:false`), followed by `worker_lifetime_no_successor` + `reattach_probe` entries rather than a dropped call.

---

## Honest residuals (not claimed as fixed)

* No live-call success is claimed here — the first real call after this deploy is the test.
* The re-attach path can only be as fast as the platform allows: ~30 s of probe coverage per worker death, then the 5-minute watchdog sweep.
* A **watchdog** probe is seeded from the record, which has no stored `handledCallIds`; a worker-death probe inherits them from the dead worker's state. Order-level duplicate protection (`logPhoneOrder`'s call-id dedupe) is unchanged and still applies.
* The root **cause** of the attach refusals is still unknown by design — this build captures the line's exact refusal reason (`HTTP <status>: <body>`) on `hop_handoff` / `reattach_probe` so the next real call names it.