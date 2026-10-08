// One slice of a Live (SIP) phone call.
//
// The platform takes a backend function down about twenty seconds after it has
// answered, so a single invocation cannot hold the call's sideband socket for a
// whole conversation — the earlier one-worker version went silent around the
// twenty-second mark of every call. Each hop therefore drives the call for a
// short window and, before its own worker is taken down, starts the next hop and
// waits for it to confirm its socket is live. The next socket is up before this
// one closes, so the caller never hears a gap.
//
// Issue #82 (2026-10-08): a handover that cannot be completed NEVER ends the
// call. When a worker cannot start a successor it hands the call to the
// re-attach probe chain (probe:true) instead of hanging up, the chain keeps
// trying for about thirty seconds, and the watchdog picks the call up from
// there — the caller stays on the line the whole way. This entry also answers an
// unauthorized caller with the driver version, which is how a deploy is verified
// without placing a call.
//
// Called by smashieSipIncoming (first hop), by the previous hop, by its own probe
// chain, and by smashieLiveWatchdog. The relay key in the payload is what proves
// the call came from inside the app.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { driveLiveHop, probeStateFromRecord, DRIVER_VERSION } from '../../shared/smashieLiveSession.ts';

// Safety net for a call that never ends: 75 hops is about fifteen minutes at the
// fifteen-second hop cadence.
const MAX_HOPS = 75;
// Issue #82 (3.2): the probe chain is at most six attempts, five seconds apart —
// about thirty seconds of coverage after a worker handed the call over. When they
// are all refused the chain stops probing and leaves the record marked for the
// watchdog instead. Nothing in this chain hangs up.
const MAX_PROBES = 6;
const PROBE_DELAY_MS = 5000;
// A socket that attached within this window is already driving the call, so a
// probe must not put a second worker on it (3.3).
const FRESH_ATTACH_MS = 6000;

// One probe, five seconds out: the worker that scheduled it has already gone, so
// the sleep and the invoke are kept alive by the runtime's post-response window.
function scheduleProbe({ base44, relayKey, sessionId, conversationId, callerPhone, counterPhone, state, probeCount }) {
  return (async () => {
    await new Promise((resolve) => setTimeout(resolve, PROBE_DELAY_MS));
    try {
      await base44.asServiceRole.functions.invoke('smashieLiveHop', {
        relayKey,
        sessionId,
        conversationId,
        callerPhone,
        counterPhone,
        state,
        probe: true,
        probeCount,
      });
      console.log(`Re-attach probe ${probeCount} launched for conversation ${conversationId}`);
    } catch (err) {
      console.error(`Re-attach probe ${probeCount} could not be launched for ${conversationId}:`, err.message);
    }
  })();
}

// Appends one line to a call record's action log without touching the rest of the
// record — used when the probe chain runs out of attempts and the watchdog takes
// over the call.
async function appendLogEntry(base44, conversationId, entry) {
  try {
    const record = await base44.asServiceRole.entities.SmsConversation.get(conversationId);
    const toolLog = Array.isArray(record?.tool_log) ? [...record.tool_log] : [];
    toolLog.push({ at: new Date().toISOString(), ...entry });
    await base44.asServiceRole.entities.SmsConversation.update(conversationId, { tool_log: toolLog, needs_reattach: true });
  } catch (err) {
    console.error(`Could not record the probe chain's outcome on ${conversationId}:`, err.message);
  }
}

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const relayKey = Deno.env.get('OPENAI_WEBHOOK_SECRET');
    if (!relayKey || body.relayKey !== relayKey) {
      return Response.json({ error: 'Unauthorized', driver: DRIVER_VERSION }, { status: 403 });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    const { sessionId, conversationId, callerPhone, counterPhone, greeting, probe, probeCount } = body;
    if (!apiKey || !sessionId || !conversationId) {
      return Response.json({ error: 'Missing session details' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const attempt = Math.max(1, Number(probeCount) || 1);
    let state = body.state || {};

    // Issue #82 (3.2/3.3): a probe drives the call from what the record already
    // holds, and stands down when the call is over or another worker is already
    // driving it — one socket owns the tools at a time.
    if (probe) {
      const record = await base44.asServiceRole.entities.SmsConversation.get(conversationId).catch(() => null);
      if (!record || record.status !== 'active') {
        return Response.json({ attached: false, skipped: 'the call is no longer active' });
      }
      const log = Array.isArray(record.tool_log) ? record.tool_log : [];
      const lastAttach = [...log].reverse().find((entry) => entry?.name === 'sideband_attached');
      const attachedAt = lastAttach ? Date.parse(lastAttach.at || '') : NaN;
      if (Number.isFinite(attachedAt) && Date.now() - attachedAt < FRESH_ATTACH_MS) {
        return Response.json({ attached: false, skipped: 'a worker attached moments ago and is already driving this call' });
      }
      state = probeStateFromRecord(record, state);
    }

    if ((state.hop || 0) >= MAX_HOPS) {
      return Response.json({ error: 'Hop limit reached' }, { status: 429 });
    }

    let announceAttached;
    const attached = new Promise((resolve) => { announceAttached = resolve; });
    // Why this hop could not attach, handed back to the previous hop so a failed
    // handover lands on the call record carrying the line's own refusal — the
    // exact OpenAI HTTP status and error body (issue #82, 3.1/5.2).
    let attachFailure = '';

    const drive = driveLiveHop({
      base44,
      sessionId,
      apiKey,
      conversationId,
      callerPhone,
      counterPhone: counterPhone || '',
      // Only the first hop greets: a later hop, or a probe re-attaching a call
      // that is already underway, must never re-introduce Smashie.
      greeting: probe || state?.hop ? '' : greeting,
      state,
      onAttached: () => announceAttached(true),
      onAttachFailure: (message) => { attachFailure = message; },
      onNoSuccessor: (probeState) => {
        // 1.5/3.2: this worker is out of life and no successor attached. The
        // caller keeps the line — one probe is scheduled five seconds out and the
        // chain continues from the probe itself.
        waitUntil(scheduleProbe({
          base44,
          relayKey,
          sessionId,
          conversationId,
          callerPhone,
          counterPhone,
          state: probeState,
          probeCount: 1,
        }));
      },
      onProbeFailure: (reason) => {
        const next = attempt + 1;
        if (next > MAX_PROBES) {
          // 3.2: six attempts made. Stop probing, leave the call marked for
          // re-attach, and let the watchdog keep trying. Still no hang-up.
          waitUntil(appendLogEntry(base44, conversationId, {
            name: 'reattach_probe_exhausted',
            ok: false,
            detail: `${attempt} re-attach probes could not attach; the watchdog takes the call over. Last reason: ${String(reason).slice(0, 500)}`,
          }));
          return;
        }
        waitUntil(scheduleProbe({
          base44,
          relayKey,
          sessionId,
          conversationId,
          callerPhone,
          counterPhone,
          state: body.state || {},
          probeCount: next,
        }));
      },
      handoff: async (nextState) => {
        const res = await base44.asServiceRole.functions.invoke('smashieLiveHop', {
          relayKey,
          sessionId,
          conversationId,
          callerPhone,
          counterPhone,
          state: nextState,
        });
        const data = res?.data ?? res;
        return { attached: !!(data && data.attached), reason: String(data?.reason || data?.error || '') };
      },
    });
    waitUntil(drive);

    // Answer as soon as this hop's socket is live — or as soon as it has given up
    // attaching. Waiting on the attach alone left this request hanging forever
    // when the attach failed, and the previous hop's handoff hung with it instead
    // of retrying (issue #81).
    const isAttached = await Promise.race([attached, drive.then(() => false, () => false)]);
    return Response.json({ attached: isAttached, reason: isAttached ? '' : attachFailure, probe: !!probe, attempt });
  } catch (error) {
    console.error('smashieLiveHop error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}