# BuilderReport: phone_dead_air_fix_2026-10-07

Issue #81. Approved by Wesley Oct 7, 2026 ("Approved on phone fix"). Built on **main**. No test calls or test orders were made.

## Step 1: Deploy audit (live values)

| Item | Live value |
|---|---|
| Call path | Twilio SIP trunk → OpenAI Live → `smashieSipIncoming` (accepts the call) → `smashieLiveHop` (sideband worker) → hop chain |
| Live model / voice / backend | `gpt-live-1`, voice `verse`, delegated backend `gpt-6-luna` (unchanged) |
| Build that answered every call from Oct 6 16:25 UTC to Oct 7 23:42 UTC | driver `live-driver-2026-10-02-hop` (commit 101dcfe, Oct 2), **HOP_MS = 12000** |
| Deploy gap | Calls from Oct 2 to Oct 4 still ran the older `live-driver-2026-10-01b`. The hop build reached live calls only on Oct 6, four days after its commit. |
| Issue #79 build (HOP_MS 6000, handoff logging, worker_stopped, first-caller save) | Committed Oct 8 03:00 UTC (3181baf), **after** the last real call. No live call has run it yet. |
| SmashieSettings | realtime_sip_enabled = true, voice_ordering_enabled = true, sms_auto_reply_enabled = true, phone_intro set, sip_transfer_target set |
| COUNTER_PHONE_NUMBER secret | present |
| Post-patch deploy check | `smashieLiveHop` is serving: an unsigned probe got 403 in 282 ms. No call was placed. |

## Step 2: Root cause (found before patching)

**The hop handoff deadlocked on itself.** The handoff ran as a task *inside* the call's serialized work queue, and the first thing it did was `await chain`. `chain` is the promise that only settles after that same task finishes, so the task waited on itself forever.

When the hop came due (12 s on the live build), the queue froze for good:
- no handoff was ever attempted, so no hop-2 record ever existed
- no further transcript saves happened
- no tool calls ran: no menu lookup, no order, no message, no transfer
- no fallback speech played, because that is queued too

The worker's pending promise never settled. The platform reclaimed the worker later without running finalize, and the *next* call's sweep closed the record as "ended without a close event".

Evidence from all 19 voice records since the Oct 2 build:
- 0 tool runs, 0 handoff entries, 0 hop-2 records.
- On every hop-build call, the last write lands **≤ 11.7 s after attach**. None goes past the 12 s HOP_MS.
- 12 of 19 records were closed by the next call's sweep, never by their own worker.
- The caller's words were never saved on 17 of 19 calls. The greeting runs about 10 s, and the queue froze at 12 s, right as callers started ordering. This is the "greeting, then silence" Wesley hears.

Secondary defect: `smashieLiveHop` only answered after a successful attach. If the attach failed, its request hung forever and the previous hop's handoff hung with it instead of retrying.

Note on issue #79: HOP_MS 6000 on its own would **not** have fixed this. With the deadlock still in place, calls would have frozen at 6 s, in the middle of the greeting.

## Step 3: Worker lifecycle fix

`base44/shared/smashieLiveSession.ts`
- L326–329 `drainQueue()`: waits on the queue, and is only ever called from outside it.
- L331–398 `runHandoff()`: the handoff now runs **beside** the queue, not inside it. Tool calls and saves keep running while the handoff is in progress. Changes inside it:
  - L361: each attempt is bounded by `HANDOFF_TIMEOUT_MS` (L51, 5000 ms) so the retries fit inside the worker's life.
  - L365–373: on success, the record is written in order, the worker lets go, and any already-queued action finishes on the still-open socket before it closes.
  - L385–386: failure trails are written in queue order.
- L400–404 `startHopTimer()`: calls `runHandoff()` directly.
- Verified that no queued task (runCall L171, session.closed L293, onClose L414) awaits the queue.

`base44/functions/smashieLiveHop/entry.ts`
- L41, L65, L71: the hop now answers `{attached: false}` as soon as its attach fails, instead of hanging. The previous hop then retries or ends the call openly.

## Step 4: HOP_MS 12000 → 6000

Already done under issue #79 (3181baf), verified at `smashieLiveSession.ts` L47: `export const HOP_MS = 6000;`. It only takes effect now that Step 3 removed the deadlock.

## Step 5: Zero-gap handoff

- Hop 1 sends the greeting on the same socket that handles caller events (the attach block, `appendInstruction(sideband, greeting)`). The ordering loop is listening from the first millisecond, so there is no gap between greeting and ordering.
- Each handoff overlaps the two sockets. The successor attaches and confirms (L361) before the current worker sets `detached` and closes (L369–373). Every caller event is handled by at least one live socket.
- Actions already queued finish on the old socket (L372), and in-flight call ids carry over in `hopState()`, so nothing is dropped or run twice.
- Phone orders stay protected from a double run during the overlap by logPhoneOrder's call-id idempotency (unchanged).

## Step 6: Immediate transcript persistence

- The caller's first words are saved instantly (issue #79, L255–263, verified).
- Every finished segment from either side is saved the moment it completes (L269–285, `queue(persist)`). Those saves were blocked by the deadlock and now run.
- Partial speech is saved within 1 s (`PARTIAL_SAVE_MS`, L54 / L118; was 2 s).
- Each successor is seeded with the full transcript and tool log through `hopState()`, so the record keeps going from the last saved segment.

## Step 7: Post-fix real-call evidence

**Pending Wesley's live test call.** No builder or agent calls were made.

The record of the first real call will show the following. Each line is checkable in Admin → Communications → call log:
1. `sideband_attached`: `live-driver-2026-10-08-handoff-unblocked, hop 1`. This is the deploy marker (L60) proving the fixed build answered.
2. `hop_handoff ok … handed the call to a fresh worker` about every 6 s, then `sideband_attached … hop 2`, `hop 3`, and so on.
3. The caller's turns in the transcript, plus tool entries such as `lookup_menu` and `place_order`.
4. An order with that call's `source_call_sid`.

This section will be appended with that record once Wesley calls.

## Untouched (verified by diff: only the 2 files above changed)

- Voice `verse`, the smashieTts path and its fallback, the persona, and all prompts and tools.
- Payment wording (secure payment link, no processor names).
- Transfer dial and off-hook alerts, message taking, closed-store and busyness logic, turn cap, Square lookup, SMS toggles, phone_intro.
- Menu, kitchen tickets, and website ordering.