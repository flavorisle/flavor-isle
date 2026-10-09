// Drives one slice of a Live (SIP) phone call over the sideband socket: runs the
// actions the delegated backend asks Smashie for, returns their results, records
// what happened on the call record, then hands the call to a fresh invocation.
//
// Why hops: the platform takes a backend function down about twenty seconds
// after it has ANSWERED, so the earlier version of this pipeline — which answered
// at attach and kept running as a zombie — went silent around the twenty-second
// mark (measured 2026-10-02, and again as a probe: background writes stopped
// between twenty and thirty seconds). Issue #86 (2026-10-08) turned that around:
// a worker can hold its OWN request open, so it answers at the END of its slice
// instead (SLICE_MS below, proven against a request lifetime of at least 180s).
// Each hop therefore drives the call for a long slice and starts the next hop
// before its own slice ends, and the next socket is attached before this one
// closes so the caller never hears a gap. The few hundred milliseconds where both
// sockets are attached are why every action that costs money is guarded against
// running twice.
//
// Event shapes follow OpenAI's GPT-Live guides. Delegated work arrives inside a
// `response.event` envelope, a finished function call is a nested
// `response.output_item.done` whose item.type is "function_call" (carrying
// call_id, name and arguments), and results go back as `response.item.create`
// followed by `response.create`. Both wrapper shapes are accepted because a
// missed function call is silent dead air to the caller.
import { createCallTranscript } from './callTranscript.ts';
import { runSmashieTool } from './smashieToolRunner.ts';
import { withTimeout } from './withTimeout.ts';
import {
  attachLiveSideband,
  hangupLiveSession,
  referLiveSession,
  sendFunctionCallOutput,
  requestBackendTurn,
  appendInstruction,
  appendSpeakableNote,
} from './openaiLiveApi.ts';

const TRANSCRIPT_DONE = /^session\.(input|output)_transcript\.(done|completed)$/;
// How long a tool result may sit unanswered before Smashie says something useful
// instead of leaving the caller in silence. Shorter than one hop, so the
// fallback is always spoken inside the worker that started the action.
const TOOL_STALL_MS = 9000;
// Hard bound on one tool run. Actions are serialized, so a hung one would block
// every later result and the caller would hear nothing after "checking".
export const TOOL_TIMEOUT_MS = 10000;
// How long one hop HOLDS the call — issue #86 (2026-10-08).
//
// #82's 15000ms hop needed ~4 sideband attaches per minute, and OpenAI's edge
// refuses a call's 7th attach (HTTP 403, error code 1000, returned in under
// 300ms — not a real connection attempt) inside a rolling window. Every failed
// call hit that wall at about ninety seconds, mid-order. Holding the request
// instead: measured on this runtime a function request stays open at least 180
// seconds, and the ~20-30s reaper only applies to post-response work. 150000ms
// therefore keeps the sideband socket alive for the whole slice and takes a
// fifteen-minute call from ~60 attaches to ~7, so the wall is never approached.
export const SLICE_MS = 150000;
// The successor is started this long before the slice ends, so its socket is live
// before this one closes and the caller never hears a gap.
export const HANDOFF_LEAD_MS = 10000;
// Issue #82: a handover that fails must NEVER end the call, so there is no cap on
// handover attempts — this worker keeps starting successors for as long as it
// lives. Retries are spaced 2s, 4s, 8s, 8s… and stop only when the next one would
// not fit in the worker's remaining life (WORKER_RETRY_BUDGET_MS below), where the
// re-attach probe chain and the watchdog take the call over instead of ending it.
const RETRY_BACKOFF_MS = [2000, 4000, 8000];
// How long a worker keeps trying to hand over — measured against the worker's own
// life, which issue #86 made the slice itself. (Held over from #82's 21000ms,
// sized for workers that died soon after answering: the handover now comes due at
// SLICE_MS - HANDOFF_LEAD_MS, so an absolute 21000ms would skip every retry and
// drop the call onto the probe chain after a single attempt.) Past this point the
// recovery record and the re-attach probe are scheduled while this worker can
// still write them; the probe chain (and the watchdog behind it) carry the call on.
const WORKER_RETRY_BUDGET_MS = SLICE_MS;
// One handoff attempt: a fresh worker attaches in about a second, so a healthy
// handover confirms well inside this. Shorter than the worker's remaining life,
// so a successor that never answers still leaves room for the retries.
const HANDOFF_TIMEOUT_MS = 3500;
// Issue #86 (2.1): a successor is started fire-and-forget, so it cannot report its
// own attach back. Its arrival is read off the call record's sideband_attached
// marker instead — this is how often that record is polled inside the window.
const SUCCESSOR_POLL_MS = 300;
// Partial speech is saved at most this long after it arrives; every finished
// segment is saved the moment it completes.
const PARTIAL_SAVE_MS = 1000;
export const MAX_CALL_MS = 15 * 60 * 1000;
// Written into every call record's sideband_attached entry, so the record of
// the first real call shows exactly which build answered it (issue #81 deploy
// audit: the hop build only reached live calls on Oct 6, four days after it was
// committed). The hop also hands it back on an unauthorized request, which is
// how a deploy is verified without placing a call (issue #82, 7.3).
export const DRIVER_VERSION = 'live-driver-2026-10-08-long-slice';

export async function driveLiveHop({ base44, sessionId, apiKey, conversationId, callerPhone, counterPhone, greeting, state = {}, onAttached, onAttachFailure, onNoSuccessor, onProbeFailure, handoff }) {
  const startedAt = state.startedAt || Date.now();
  const hopNumber = (state.hop || 0) + 1;
  const callTranscript = createCallTranscript(state.transcript || []);
  const toolLog = Array.isArray(state.toolLog) ? [...state.toolLog] : [];
  // Each action runs once: the same finished call can be observed by two sockets
  // during a handover, and a repeat of place_order would create a second order.
  const handledCalls = new Set(state.handledCallIds || []);
  let introPlaying = state.introPlaying !== false;
  let introHandedOver = !!state.introHandedOver;
  // A4: the caller's first words are flushed to the record the moment they
  // arrive instead of waiting on the two-second save debounce — an early worker
  // death must never lose the reason the caller rang.
  let firstCallerSaved = !!state.firstCallerSaved;

  let saveTimer = null;
  let stallTimer = null;
  let hopTimer = null;
  let finalized = false;
  let handedOff = false;
  // Issue #82: set when this worker let go of the call and handed it to the
  // re-attach probe chain. The call is still up, so the socket closing later must
  // not record it as finished.
  let recoveryHandedOver = false;
  let detached = false;
  let sessionClosed = false;
  let sideband = null;
  let finishHop;
  const hopFinished = new Promise((resolve) => { finishHop = resolve; });
  // Events arrive faster than the writes they trigger — every write goes through
  // this chain so the transcript keeps the caller's order.
  let chain = Promise.resolve();

  const queue = (work) => {
    chain = chain.then(work).catch((err) => console.error('Live session task failed:', err.message));
  };

  const recordTool = (entry) => {
    toolLog.push({ at: new Date().toISOString(), ...entry });
    console.log(`Live tool ${entry.name} (caller ${callerPhone || 'unknown'}) ${entry.ok ? 'ok' : 'FAILED'}${entry.ms ? ` in ${entry.ms}ms` : ''}${entry.ok ? '' : ` — ${entry.detail || 'no detail'}`}`);
  };

  const persist = async (extra = {}) => {
    if (handedOff) return;
    const transcript = callTranscript.snapshot();
    await base44.asServiceRole.entities.SmsConversation.update(conversationId, {
      transcript,
      tool_log: toolLog,
      last_message_at: new Date().toISOString(),
      message_count: transcript.length,
      ...extra,
    });
  };

  // Save partial speech too: a missing turn-end event must not lose the call.
  const scheduleSave = () => {
    if (saveTimer || finalized || handedOff) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      queue(persist);
    }, PARTIAL_SAVE_MS);
  };

  const clearStall = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = null;
  };

  const sayInsteadOfSilence = () => {
    clearStall();
    stallTimer = setTimeout(() => {
      stallTimer = null;
      if (finalized || detached || !sideband) return;
      const fallback = counterPhone
        ? `My bad fam, I'm having trouble pulling that up. I can take a message for the crew, or you can call the counter at ${counterPhone}.`
        : "My bad fam, I'm having trouble pulling that up. I can take a message for the crew and they'll follow up with you.";
      appendSpeakableNote(sideband, fallback);
      recordTool({ name: 'spoken_fallback', ok: false, detail: 'nothing came back after the last action, so Smashie spoke instead of going quiet' });
      queue(persist);
    }, TOOL_STALL_MS);
  };

  const finalize = async (failure = '') => {
    clearStall();
    if (hopTimer) clearTimeout(hopTimer);
    clearTimeout(saveTimer);
    saveTimer = null;
    hopTimer = null;
    finishHop();
    if (finalized) return;
    finalized = true;
    recordTool({
      name: 'worker_stopped',
      ok: !failure,
      detail: failure || `this worker's turn on the call ended normally after ${Math.round((Date.now() - startedAt) / 1000)}s`,
    });
    const transcript = callTranscript.snapshot();
    await base44.asServiceRole.entities.SmsConversation.update(conversationId, {
      transcript,
      tool_log: toolLog,
      last_message_at: new Date().toISOString(),
      message_count: transcript.length,
      status: 'completed',
      call_status: failure ? 'failed' : 'completed',
      description: failure ? failure.slice(0, 1000) : 'Live session ended normally.',
      call_duration: Math.round((Date.now() - startedAt) / 1000),
    });
  };

  const runCall = (item) => {
    if (handledCalls.has(item.call_id)) return;
    handledCalls.add(item.call_id);

    queue(async () => {
      // Preserve both sides before a tool can hand the caller to the counter.
      await persist();
      let args = {};
      if (item.arguments) {
        try {
          args = JSON.parse(item.arguments);
        } catch (e) {
          console.error('Tool arguments were not valid JSON:', e.message);
        }
      }
      const toolStartedAt = Date.now();
      let result;
      try {
        result = await withTimeout(() => runSmashieTool(base44, { name: item.name, args, callerPhone, sessionId }), TOOL_TIMEOUT_MS, `tool ${item.name}`);
        recordTool({
          name: item.name,
          ok: true,
          ms: Date.now() - toolStartedAt,
          detail: String(result.output || '').slice(0, 300),
        });
      } catch (err) {
        recordTool({ name: item.name, ok: false, ms: Date.now() - toolStartedAt, detail: err.message });
        const timedOut = err?.name === 'TimeoutError';
        result = {
          output: JSON.stringify({
            error: timedOut && item.name === 'place_order'
              ? 'The order system is slow. The order may have been saved, so do not place it again. Tell the caller the crew will confirm it by text, give the total if you already know it, and offer the counter number.'
              : 'That action failed on our side. Apologize briefly and offer to take a message for the crew or pass the caller to the counter.',
          }),
        };
      }

      let output = result.output;
      if (result.transferTargetUri) {
        const refer = await referLiveSession(sessionId, apiKey, result.transferTargetUri);
        console.log(`Counter transfer refer: ${refer.ok ? 'accepted' : `failed (${refer.status})`}`);
        recordTool({ name: 'counter_transfer', ok: refer.ok, detail: refer.ok ? result.transferTargetUri : `refer failed (${refer.status})` });
        if (!refer.ok) {
          output = JSON.stringify({
            transfer_available: false,
            note: counterPhone
              ? `The counter line could not take the transfer. Offer ${counterPhone} or take a message for the crew.`
              : 'The counter line could not take the transfer. Offer to take a message for the crew.',
          });
        }
      }

      try {
        sendFunctionCallOutput(sideband, item.call_id, output);
      } catch (err) {
        recordTool({ name: item.name, ok: false, detail: `result could not be delivered: ${err.message}` });
      }
      // Always ask for the next turn: a tool result nobody speaks is dead air.
      try {
        requestBackendTurn(sideband);
      } catch (err) {
        recordTool({ name: item.name, ok: false, detail: `next turn could not be requested: ${err.message}` });
      }
      sayInsteadOfSilence();
      await persist();
    });
  };

  const handleDelegation = (event) => functionCallsFrom(event).forEach(runCall);

  // The first time each kind of event arrives it is written to the call record,
  // so what the line really sends is visible in Admin without server logs.
  const seenEvents = new Set();
  const noteEvent = (event) => {
    const outer = event?.type || '';
    const label = event?.event?.type ? `${outer} > ${event.event.type}` : outer;
    if (!label || /_transcript\.delta$/.test(outer) || seenEvents.has(label) || seenEvents.size >= 40) return;
    seenEvents.add(label);
    recordTool({ name: 'event', ok: true, detail: label });
    scheduleSave();
  };

  const onEvent = (event) => {
    if (detached) return;
    const type = event?.type || '';
    noteEvent(event);

    if (type === 'session.input_transcript.delta' || type === 'session.output_transcript.delta') {
      // Capture synchronously; queued writes must never clear newer speech.
      const fromCaller = type.includes('input');
      callTranscript.capture(fromCaller ? 'user' : 'assistant', event);
      if (fromCaller && !firstCallerSaved) {
        // A4: save the caller's opening request immediately — do not risk it to
        // the debounce if this worker is taken down moments later.
        firstCallerSaved = true;
        queue(persist);
      } else {
        scheduleSave();
      }
      return;
    }

    if (TRANSCRIPT_DONE.test(type)) {
      const isCaller = type.includes('input');
      callTranscript.capture(isCaller ? 'user' : 'assistant', event, true);
      if (isCaller) {
        // The caller spoke while the introduction was still playing — capture
        // their request and answer it rather than talking over them.
        if (introPlaying && !introHandedOver && sideband) {
          introHandedOver = true;
          appendInstruction(sideband, 'The caller is talking while your introduction is still playing. Stop the introduction immediately and answer what they just said in one short sentence.');
          recordTool({ name: 'intro_handover', ok: true, detail: 'caller spoke over the introduction — Smashie asked to answer them' });
        }
      } else {
        introPlaying = false;
        clearStall();
      }
      queue(persist);
      return;
    }

    handleDelegation(event);
    if (nestedType(event) === 'response.completed') clearStall();

    if (type === 'session.closed') {
      sessionClosed = true;
      queue(async () => {
        if (handedOff) return;
        await finalize();
        detached = true;
        sideband?.close();
      });
      return;
    }

    if (type === 'error') console.error('Live session error event:', JSON.stringify(event).slice(0, 500));
  };

  // Everything the next hop needs to carry on: one continuous transcript, the
  // actions already run, and the introduction state.
  const hopState = () => ({
    transcript: callTranscript.snapshot(),
    toolLog,
    handledCallIds: [...handledCalls],
    introPlaying,
    introHandedOver,
    firstCallerSaved,
    startedAt,
    hop: hopNumber,
  });

  const endCall = async (failure, hangUp = false) => {
    detached = true;
    await chain.catch(() => {});
    await finalize(failure);
    sideband?.close();
    if (hangUp) await hangupLiveSession(sessionId, apiKey).catch(() => {});
    finishHop();
  };

  // Waits for every write and action queued so far. Only ever awaited from
  // OUTSIDE the queue — see runHandoff.
  const drainQueue = () => chain.catch(() => {});

  // Issue #86 (2.1/2.2/2.3): the successor is started and NOT awaited — it now
  // holds its own request open for a whole slice, so waiting on that body would
  // tie this worker up for minutes. Its arrival is read off the call record
  // instead: a freshly attached worker writes a sideband_attached entry carrying
  // its own hop number, and anything strictly greater than this worker's own is
  // the successor. Nothing else writes one inside this window, and a late
  // duplicate from a retry stands itself down in the hop entry (3.3), so a retry
  // can never double-attach on top of a live socket.
  const confirmSuccessorAttached = async () => {
    const deadline = Date.now() + HANDOFF_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const record = await base44.asServiceRole.entities.SmsConversation.get(conversationId).catch(() => null);
      const log = Array.isArray(record?.tool_log) ? record.tool_log : [];
      const latest = [...log].reverse().find((entry) => entry?.name === 'sideband_attached');
      if (Number(latest?.hop) > hopNumber) return { attached: true, reason: '' };
      await new Promise((resolve) => setTimeout(resolve, SUCCESSOR_POLL_MS));
    }
    return { attached: false, reason: 'the successor did not attach inside the handoff window' };
  };

  // By the time the handover is confirmed the successor has already written its
  // own attach marker, so this worker's last write merges the record's log rather
  // than overwriting it — a log collected before the successor attached would
  // otherwise erase the marker (and anything the new socket has written).
  const mergeToolLogFromRecord = async () => {
    const record = await base44.asServiceRole.entities.SmsConversation.get(conversationId).catch(() => null);
    const saved = Array.isArray(record?.tool_log) ? record.tool_log : [];
    if (!saved.length) return;
    const seen = new Set(saved.map((entry) => `${entry?.at || ''}|${entry?.name || ''}`));
    const mine = toolLog.filter((entry) => !seen.has(`${entry?.at || ''}|${entry?.name || ''}`));
    toolLog.length = 0;
    toolLog.push(...saved, ...mine);
  };

  // Issue #82 (1.5): this worker cannot hold the call any longer and no successor
  // picked it up. The caller STAYS ON THE LINE — nothing here hangs up. The call
  // record is left active and marked needs_reattach, the reason trail is written
  // while this worker can still write it, and one re-attach probe is scheduled to
  // attach a fresh socket a few seconds from now. The probe chain, then the
  // watchdog, carry the call on from there.
  const handOverToProbes = async (toolName, failures) => {
    const detail = failures.length ? failures.join(' | ').slice(0, 900) : 'no reason reported';
    recordTool({ name: toolName, ok: false, detail });
    recoveryHandedOver = true;
    detached = true;
    queue(persist({ needs_reattach: true }));
    await drainQueue();
    if (onNoSuccessor) {
      try {
        onNoSuccessor(hopState());
      } catch (err) {
        console.error('Live re-attach probe could not be scheduled:', err.message);
      }
    }
    sideband?.close();
    finishHop();
  };

  // Issue #81 root cause: the handoff used to run as a task INSIDE the work
  // queue and then `await chain` — the promise that only settles once that same
  // task finishes. It waited on itself forever, so the moment the hop came due
  // (12s on the build live since Oct 6) the queue froze for good: no handoff, no
  // transcript saves, no tool runs, no fallback speech, and the worker was later
  // reclaimed with nothing recorded. The handoff now runs beside the queue, and
  // actions keep running while it is in progress.
  const runHandoff = async () => {
    if (finalized || handedOff) return;
    // Let actions already queued finish, so their results are spoken before the
    // call changes hands.
    await drainQueue();
    if (finalized || handedOff) return;

    if (Date.now() - startedAt > MAX_CALL_MS) {
      if (sideband) appendSpeakableNote(sideband, 'I have to let you go here — sorry about that. Give the counter a call and they will take care of you.');
      await endCall('Call ran past the maximum tracked length; whatever was captured was saved.', true);
      return;
    }

    // Issue #82: no cap. Every attempt is written to the call record with its
    // exact outcome so a call that struggles to change hands is diagnosable
    // afterwards. Issue #86 replaced the hop's own refusal text — which a
    // fire-and-forget successor can no longer return — with the record's own
    // attach marker as the thing that confirms a handover. Never ends the call.
    const failures = [];
    let attempt = 0;
    while (!finalized && !handedOff && !recoveryHandedOver) {
      attempt += 1;
      const attemptAt = Date.now();
      recordTool({ name: 'hop_handoff', ok: true, detail: `handoff attempt ${attempt} — starting a fresh worker` });
      try {
        // Bounded so a successor that never confirms cannot use up this worker's
        // remaining life before the retries run. The launch itself is instant and
        // fire-and-forget (2.1); the window is spent polling the call record.
        const next = await withTimeout(async () => {
          await handoff(hopState());
          return confirmSuccessorAttached();
        }, HANDOFF_TIMEOUT_MS + 1000, 'hop handoff');
        if (next?.attached) {
          recordTool({ name: 'hop_handoff', ok: true, ms: Date.now() - attemptAt, detail: `hop ${hopNumber} handed the call to a fresh worker; this socket can close now` });
          // Write the record while this worker still owns it (persist() is a
          // no-op once handedOff is set), in order behind any queued saves — and
          // from the record's own log, which already holds the successor's attach.
          await mergeToolLogFromRecord();
          queue(persist);
          await drainQueue();
          // The successor's socket is live and takes every new event from here.
          handedOff = true;
          detached = true;
          // Anything this worker queued before it let go finishes on its own
          // still-open socket, so no result is dropped in the changeover.
          await drainQueue();
          sideband?.close();
          finishHop();
          return;
        }
        // 2026-10-08 (real call): handovers 1-5 were clean, then three refusals in
        // a row cut the caller off mid-order — each one back in under 200ms, far
        // too fast for a real connection attempt. That is the attach wall issue #86
        // removes by cutting the attach cadence; whatever the attempt costs is
        // written here, so the next call records the actual outcome.
        const why = String(next?.reason || '').trim();
        failures.push(`attempt ${attempt}: ${why || 'the fresh worker did not confirm its socket attached, and reported no reason'}`);
      } catch (err) {
        failures.push(`attempt ${attempt} failed: ${err.message}`);
        console.error('Live handoff failed:', err.message);
      }
      recordTool({ name: 'hop_handoff', ok: false, ms: Date.now() - attemptAt, detail: failures[failures.length - 1] });
      // Write the failure trail before the worker is taken down.
      queue(persist);
      await drainQueue();
      if (finalized || handedOff || recoveryHandedOver) break;
      // Another attempt only when it fits in what is left of this worker's life:
      // past that point the probe chain owns the recovery, not this worker.
      const waitMs = RETRY_BACKOFF_MS[Math.min(attempt - 1, RETRY_BACKOFF_MS.length - 1)];
      if (WORKER_RETRY_BUDGET_MS - (Date.now() - startedAt) < waitMs) break;
      await new Promise((r) => setTimeout(r, waitMs));
    }
    if (handedOff || finalized || recoveryHandedOver) return;

    // Out of chances to start a successor: hand the call to the probe chain
    // rather than hanging the caller up mid-order.
    await handOverToProbes('worker_lifetime_no_successor', failures);
  };

  const startHopTimer = () => {
    hopTimer = setTimeout(() => {
      runHandoff().catch((err) => console.error('Live handoff crashed:', err.message));
    }, SLICE_MS - HANDOFF_LEAD_MS);
  };

  try {
    sideband = await attachLiveSideband(sessionId, apiKey, {
      onEvent,
      onClose: (code, reason) => {
        console.log(`Live sideband closed (${code}) for session ${sessionId}: ${reason || ''}`);
        recordTool({ name: 'sideband_closed', ok: true, detail: `the line dropped this worker's socket (code ${code ?? 'none'}): ${reason || 'no reason supplied'}` });
        // A handover closes this socket on purpose; the next hop owns the call.
        if (handedOff) return;
        // Issue #82: this socket was closed on the way out to the probe chain and
        // the call is still up, so the record must not be closed as finished.
        if (recoveryHandedOver) {
          finishHop();
          return;
        }
        queue(async () => {
          // OpenAI sends session.closed just before the socket drops; give that
          // event a moment so a normal ending is not recorded as a fault.
          await new Promise((r) => setTimeout(r, 1500));
          if (handedOff || finalized) return;
          await finalize(sessionClosed ? '' : `Call ended without a close event (sideband disconnected, ${code}): ${reason || 'no reason supplied'}`);
          finishHop();
        });
      },
    });
    console.log(`Live sideband attached for session ${sessionId} (hop ${hopNumber})`);
    if (greeting) appendInstruction(sideband, greeting);
    // The structured hop field (issue #86, 2.2) is what the previous hop's handoff
    // poll and every later worker's stand-down guard read; the detail keeps the
    // wording Admin shows.
    recordTool({ name: 'sideband_attached', ok: true, hop: hopNumber, detail: `call connected to the app (${DRIVER_VERSION}, hop ${hopNumber})` });
    // A live worker owns the call again, so the record no longer needs one; the
    // same write refreshes last_message_at, which is what tells the watchdog the
    // call is still being heard (issue #82).
    queue(persist({ needs_reattach: false }));
    if (onAttached) onAttached();
    startHopTimer();
    // Hold on until this slice is done. Issue #86 (1.2): the hop entry keeps its
    // own request open on this promise, and that unanswered request is what keeps
    // this worker — and therefore this socket — alive for the whole slice.
    await hopFinished;
    return { hop: hopNumber, durationMs: Date.now() - startedAt };
  } catch (e) {
    console.error(`Live sideband failed for ${sessionId}:`, e.message);
    // Handed back to the previous hop so a failed handover is recorded with the
    // line's own reason for refusing the socket.
    if (onAttachFailure) onAttachFailure(e.message);
    sideband?.close();
    clearTimeout(hopTimer);
    clearTimeout(saveTimer);
    await chain.catch(() => {});
    // Issue #82: a worker that cannot attach must NEVER hang up. The caller keeps
    // the line — the call is marked for re-attach and the probe chain (for a probe
    // itself, the next probe in it) picks the call up again. A later hop that
    // cannot attach likewise leaves the call alone: the previous hop still holds
    // it and retries the handover under the same rule.
    recordTool({ name: 'attach_failed', ok: false, detail: `this worker could not attach: ${e.message}` });
    if (onProbeFailure) {
      recordTool({ name: 'reattach_probe', ok: false, detail: `a re-attach probe could not attach: ${e.message}` });
      queue(persist({ needs_reattach: true }));
      await drainQueue();
      onProbeFailure(e.message);
    } else {
      await handOverToProbes('worker_lifetime_no_successor', [`this worker could not attach: ${e.message}`]);
    }
    finishHop();
    return { hop: hopNumber, durationMs: Date.now() - startedAt };
  }
}

// Issue #82 (STEP 3.2): a re-attach probe drives the call from what the record
// already holds, so a probed call keeps one continuous transcript, the actions
// already run, and the introduction state. The hop count comes from the record's
// own attach markers, which is what stops a probe re-introducing Smashie.
export function probeStateFromRecord(record, fallback = {}) {
  const startedAt = Date.parse(record?.call_started_at || record?.created_date || '');
  const log = Array.isArray(record?.tool_log) ? record.tool_log : [];
  const attaches = log.filter((entry) => entry?.name === 'sideband_attached').length;
  return {
    ...fallback,
    transcript: Array.isArray(record?.transcript) && record.transcript.length
      ? record.transcript
      : (fallback.transcript || []),
    toolLog: log,
    startedAt: Number.isFinite(startedAt) ? startedAt : (fallback.startedAt || Date.now()),
    hop: Math.max(attaches, Number(fallback.hop) || 0),
    introPlaying: false,
    introHandedOver: true,
    firstCallerSaved: true,
  };
}

// Finished function calls can be reported as a nested or top-level
// output_item.done, or inside a completed response's output list. Only completed
// events are read, so a call still streaming its arguments is never run early;
// duplicates are dropped by call_id before anything executes.
function functionCallsFrom(event) {
  const calls = [];
  const visit = (node, depth) => {
    if (!node || typeof node !== 'object' || depth > 6) return;
    if (node.type === 'function_call' && node.name && node.call_id && typeof node.arguments === 'string' && node.status !== 'in_progress') {
      calls.push(node);
      return;
    }
    for (const value of Object.values(node)) visit(value, depth + 1);
  };
  if (/\.(done|completed)$/.test(event?.event?.type || event?.type || '')) visit(event, 0);
  return calls;
}

function nestedType(event) {
  return event?.event?.type || event?.type || '';
}

// A call whose sockets all died before it was recorded as finished would sit as
// "active" forever with no outcome. The next inbound call sweeps those records
// closed with the duration we can still work out.
export async function closeAbandonedVoiceCalls(base44, { olderThanMinutes = 15 } = {}) {
  const cutoff = Date.now() - olderThanMinutes * 60 * 1000;
  const open = await base44.asServiceRole.entities.SmsConversation.filter({ channel: 'voice', status: 'active' }, '-last_message_at', 50);
  let closed = 0;
  for (const call of open || []) {
    const lastEventAt = new Date(call.last_message_at || call.call_started_at || call.created_date || 0).getTime();
    if (!lastEventAt || lastEventAt > cutoff) continue;
    const startedAt = new Date(call.call_started_at || call.created_date || lastEventAt).getTime();
    await base44.asServiceRole.entities.SmsConversation.update(call.id, {
      status: 'completed',
      call_status: 'completed',
      call_duration: Math.max(0, Math.round((lastEventAt - startedAt) / 1000)),
      description: 'Call ended without a close event from the line — closed out so the log stays accurate.',
    });
    closed += 1;
  }
  if (closed) console.log(`Closed ${closed} abandoned voice call record(s).`);
  return closed;
}