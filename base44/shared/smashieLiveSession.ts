// Drives one Live (SIP) phone call over the sideband socket: runs the actions
// the delegated backend asks Smashie for, returns their results, records what
// happened on the call record, and closes the record when the call ends.
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
// How long a tool result may sit unanswered before Smashie says something
// useful instead of leaving the caller in silence.
const TOOL_STALL_MS = 12000;

// Accepted sideband sockets are held here for the life of the call: the webhook
// response has already gone out, so this reference is what keeps the live
// socket reachable while the caller is talking.
const LIVE_SOCKETS = new Set<string>();

const DRIVER_VERSION = 'live-driver-2026-10-01b';

// Finished function calls can be reported as a nested or top-level
// output_item.done, or inside a completed response's output list. Only
// completed events are read, so a call still streaming its arguments is never
// run early; duplicates are dropped by call_id before anything executes.
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

export async function driveLiveSession({ base44, sessionId, apiKey, conversationId, callerPhone, counterPhone, greeting }) {
  const startedAt = Date.now();
  const callTranscript = createCallTranscript();
  const toolLog = [];
  let saveTimer = null;
  let stallTimer = null;
  let finalized = false;
  let sideband = null;
  let sessionClosed = false;
  // Each action runs once: the same finished call can be observed more than
  // once, and a repeat of place_order would create a second order.
  const handledCalls = new Set();
  // True until the introduction has finished: a caller who talks over it still
  // has their first request captured and answered.
  let introPlaying = true;
  let introHandedOver = false;
  // Events arrive faster than the writes they trigger — every write goes
  // through this chain so the transcript keeps the caller's order.
  let chain = Promise.resolve();

  const queue = (work) => {
    chain = chain.then(work).catch((err) => console.error('Live session task failed:', err.message));
  };

  const recordTool = (entry) => {
    toolLog.push({ at: new Date().toISOString(), ...entry });
    console.log(`Live tool ${entry.name} ${entry.ok ? 'ok' : 'FAILED'}${entry.ms ? ` in ${entry.ms}ms` : ''}${entry.ok ? '' : ` — ${entry.detail || 'no detail'}`}`);
  };

  const persist = async (extra = {}) => {
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
    if (saveTimer || finalized) return;
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
      if (finalized || !sideband) return;
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
    clearTimeout(saveTimer);
    saveTimer = null;
    if (finalized) return;
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
    finalized = true;
    LIVE_SOCKETS.delete(sessionId);
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
        await finalize();
        sideband?.close();
      });
      return;
    }

    if (type === 'error') console.error('Live session error event:', JSON.stringify(event).slice(0, 400));
  };

  try {
    sideband = await attachLiveSideband(sessionId, apiKey, {
      onEvent,
      onClose: (code, reason) => {
        console.log(`Live sideband closed (${code}) for session ${sessionId}: ${reason || ''}`);
        // Guidance: if the connection drops before session.closed, record the
        // finalization as incomplete rather than reporting a clean end.
        queue(() => finalize(sessionClosed ? '' : `Call ended without a close event (sideband disconnected, ${code}): ${reason || 'no reason supplied'}`));
      },
    });
    console.log(`Live sideband attached for session ${sessionId}`);
    LIVE_SOCKETS.add(sessionId);
    // Acceptance has already started the session; explicitly request the
    // opening turn rather than waiting for the caller to speak first.
    appendInstruction(sideband, greeting);
    recordTool({ name: 'sideband_attached', ok: true, detail: `call connected to the app (${DRIVER_VERSION})` });
    scheduleSave();
    // Deliberately NOT waiting for the connection here. Parked in the webhook's
    // background task, every call was cancelled at the 30-second mark with no
    // close event — Smashie went silent mid-order and the record stayed active.
    return;
  } catch (e) {
    console.error(`Live sideband failed for ${sessionId}:`, e.message);
    sideband?.close();
    await chain;
    await finalize(`The app could not connect to the call, so no menu answers or orders could run: ${e.message}`);
    await hangupLiveSession(sessionId, apiKey);
  }
}

// A call whose socket died with the worker never reports a close, so it would
// sit as "active" forever with no outcome. The next inbound call sweeps those
// records closed with the duration we can still work out.
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