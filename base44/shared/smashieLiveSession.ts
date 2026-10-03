// Drives one slice of a Live (SIP) phone call over the sideband socket: runs the
// actions the delegated backend asks Smashie for, returns their results, records
// what happened on the call record, then hands the call to a fresh invocation.
//
// Why hops: the platform takes a backend function down about twenty seconds
// after it has answered, so no single invocation can hold this socket for a
// whole conversation. The first version of this pipeline held it from the
// webhook and every call went silent around the twenty-second mark — measured
// again on 2026-10-02 with a probe: background writes stopped between twenty and
// thirty seconds. Each hop here drives the call for a short window and starts
// the next hop before its own worker is taken down, and the next socket is
// attached before this one closes so the caller never hears a gap. The few
// hundred milliseconds where both sockets are attached are why every action that
// costs money is guarded against running twice.
//
// Event shapes follow OpenAI's GPT-Live guides. Delegated work arrives inside a
// `response.event` envelope, a finished function call is a nested
// `response.output_item.done` whose item.type is "function_call" (carrying
// call_id, name and arguments), and results go back as `response.item.create`
// followed by `response.create`. Both wrapper shapes are accepted because a
// missed function call is silent dead air to the caller.
import { createCallTranscript } from './callTranscript.ts';
import { runSmashieTool } from './smashieToolRunner.ts';
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
// How long one hop drives the call before handing the socket over.
export const HOP_MS = 12000;
const MAX_HOP_FAILURES = 3;
const MAX_CALL_MS = 15 * 60 * 1000;
const DRIVER_VERSION = 'live-driver-2026-10-02-hop';

export async function driveLiveHop({ base44, sessionId, apiKey, conversationId, callerPhone, counterPhone, greeting, state = {}, onAttached, handoff }) {
  const startedAt = state.startedAt || Date.now();
  const hopNumber = (state.hop || 0) + 1;
  const callTranscript = createCallTranscript(state.transcript || []);
  const toolLog = Array.isArray(state.toolLog) ? [...state.toolLog] : [];
  // Each action runs once: the same finished call can be observed by two sockets
  // during a handover, and a repeat of place_order would create a second order.
  const handledCalls = new Set(state.handledCallIds || []);
  let introPlaying = state.introPlaying !== false;
  let introHandedOver = !!state.introHandedOver;

  let saveTimer = null;
  let stallTimer = null;
  let hopTimer = null;
  let finalized = false;
  let handedOff = false;
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
    console.log(`Live tool ${entry.name} ${entry.ok ? 'ok' : 'FAILED'}${entry.ms ? ` in ${entry.ms}ms` : ''}${entry.ok ? '' : ` — ${entry.detail || 'no detail'}`}`);
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
    }, 2000);
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
        result = await runSmashieTool(base44, { name: item.name, args, callerPhone, sessionId });
        recordTool({
          name: item.name,
          ok: true,
          ms: Date.now() - toolStartedAt,
          detail: String(result.output || '').slice(0, 300),
        });
      } catch (err) {
        recordTool({ name: item.name, ok: false, ms: Date.now() - toolStartedAt, detail: err.message });
        result = {
          output: JSON.stringify({
            error: 'That action failed on our side. Apologize briefly and offer to take a message for the crew or pass the caller to the counter.',
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

      sendFunctionCallOutput(sideband, item.call_id, output);
      // Always ask for the next turn: a tool result nobody speaks is dead air.
      requestBackendTurn(sideband);
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
      callTranscript.capture(type.includes('input') ? 'user' : 'assistant', event);
      scheduleSave();
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
    startedAt,
    hop: hopNumber,
  });

  const endCall = async (failure, hangUp = false, pendingTasks = chain) => {
    detached = true;
    await pendingTasks.catch(() => {});
    await finalize(failure);
    sideband?.close();
    if (hangUp) await hangupLiveSession(sessionId, apiKey).catch(() => {});
    finishHop();
  };

  const startHopTimer = () => {
    hopTimer = setTimeout(() => {
      const pendingTasks = chain;
      queue(async () => {
        if (finalized || handedOff) return;
        // Let an in-flight action finish, so its result is actually spoken
        // before the call changes hands.
        await pendingTasks.catch(() => {});
        if (finalized || handedOff) return;

        if (Date.now() - startedAt > MAX_CALL_MS) {
          if (sideband) appendSpeakableNote(sideband, 'I have to let you go here — sorry about that. Give the counter a call and they will take care of you.');
          await endCall('Call ran past the maximum tracked length; whatever was captured was saved.', true, pendingTasks);
          return;
        }

        let failures = 0;
        while (!finalized && !handedOff) {
          try {
            if (await handoff(hopState())) {
              handedOff = true;
              detached = true;
              sideband?.close();
              finishHop();
              return;
            }
            failures += 1;
          } catch (err) {
            failures += 1;
            console.error('Live handoff failed:', err.message);
          }
          if (failures >= MAX_HOP_FAILURES) break;
          await new Promise((r) => setTimeout(r, 1500));
        }

        // No successor picked the call up: end it openly rather than letting the
        // caller talk into a line that has stopped listening.
        if (sideband && !finalized) {
          appendSpeakableNote(sideband, "My bad fam, I'm losing the line here. Give the counter a call and they will take care of you.");
        }
        await endCall('The call could not be handed to a fresh worker before this one was shut down.', true, pendingTasks);
      });
    }, HOP_MS);
  };

  try {
    sideband = await attachLiveSideband(sessionId, apiKey, {
      onEvent,
      onClose: (code, reason) => {
        console.log(`Live sideband closed (${code}) for session ${sessionId}: ${reason || ''}`);
        // A handover closes this socket on purpose; the next hop owns the call.
        if (handedOff) return;
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
    recordTool({ name: 'sideband_attached', ok: true, detail: `call connected to the app (${DRIVER_VERSION}, hop ${hopNumber})` });
    scheduleSave();
    if (onAttached) onAttached();
    startHopTimer();
    // Hold on until this hop is done: the handler's response has already gone
    // out, and this pending promise is what keeps the socket alive this long.
    await hopFinished;
    return;
  } catch (e) {
    console.error(`Live sideband failed for ${sessionId}:`, e.message);
    sideband?.close();
    clearTimeout(hopTimer);
    clearTimeout(saveTimer);
    await chain.catch(() => {});
    // A later hop that cannot attach must leave the call alone: the previous hop
    // is still holding it and will retry the handover.
    if (!state.hop) {
      await finalize(`The app could not connect to the call, so no menu answers or orders could run: ${e.message}`);
      await hangupLiveSession(sessionId, apiKey).catch(() => {});
    }
    finishHop();
  }
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