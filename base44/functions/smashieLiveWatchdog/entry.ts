// Safety net for Live (SIP) phone calls — issue #82, STEP 4.
//
// The hop pipeline keeps a socket attached for a whole call by handing over every
// fifteen seconds, and a worker that cannot start a successor hands the call to
// the re-attach probe chain and lets go. It never hangs the caller up. This sweep
// is the net underneath that: each run it finds active inbound Live calls the app
// has stopped hearing from (nothing written for twenty seconds) and spawns one
// re-attach probe for each, so a call that lost every socket gets a worker again
// instead of leaving the caller talking to a line nobody is driving.
//
// It NEVER hangs up a call and never changes what the caller hears. Its only
// other job is bookkeeping: a Live call still marked active past the fifteen
// minute cap is closed on the record with the same wording the cap uses, so the
// call log stays true.
//
// Runs from the "Smashie Live Watchdog" workflow. The platform's minimum schedule
// interval is five minutes, which is what that workflow is set to.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { MAX_CALL_MS } from '../../shared/smashieLiveSession.ts';

// A call the app has written nothing for in this long has lost its worker.
const STALE_MS = 20000;
// A probe or an attach newer than this means a re-attach for that call is already
// in flight, so this run leaves it alone.
const PROBE_MARKER_MS = 10000;

function lastEntryNamed(log, name) {
  return [...log].reverse().find((entry) => entry?.name === name) || null;
}

// Only calls the Live (SIP) pipeline owns are probed: they are the ones with an
// OpenAI session to re-attach to. Older Twilio-pipeline conversations share the
// voice channel but have no sideband to reconnect.
function isLiveCall(call) {
  const sessionId = String(call?.call_sid || call?.conversation_id || '');
  if (/^live_/i.test(sessionId)) return true;
  return (Array.isArray(call?.tool_log) ? call.tool_log : []).some((entry) => entry?.name === 'sideband_attached');
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    // Scheduled maintenance: the platform calls this from the "Smashie Live
    // Watchdog" workflow with no user token, like the app's other scheduled
    // sweeps. A signed-in caller hitting it by hand must be an admin.
    const user = await base44.auth.me().catch(() => null);
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const relayKey = Deno.env.get('OPENAI_WEBHOOK_SECRET');
    const counterPhone = Deno.env.get('COUNTER_PHONE_NUMBER') || '';
    const now = Date.now();

    const active = await base44.asServiceRole.entities.SmsConversation.filter(
      { channel: 'voice', status: 'active' },
      '-last_message_at',
      50,
    );

    const probed = [];
    const finalized = [];
    const skipped = [];

    for (const call of active || []) {
      if (!isLiveCall(call)) continue;

      const startedAt = Date.parse(call.call_started_at || call.created_date || '');
      const lastAt = Date.parse(call.last_message_at || call.call_started_at || call.created_date || '');
      const sessionId = call.call_sid || call.conversation_id;

      // 4.3: past the cap, close the record — never the call itself.
      if (Number.isFinite(startedAt) && now - startedAt > MAX_CALL_MS) {
        finalized.push(call.id);
        if (dryRun) continue;
        await base44.asServiceRole.entities.SmsConversation.update(call.id, {
          status: 'completed',
          call_status: 'completed',
          needs_reattach: false,
          call_duration: Math.max(0, Math.round(((Number.isFinite(lastAt) ? lastAt : now) - startedAt) / 1000)),
          description: 'closed by watchdog at 15-minute cap',
        });
        continue;
      }

      if ((call.call_direction || 'inbound') !== 'inbound') continue;
      // A call the app is still hearing from has a worker on it.
      if (!Number.isFinite(lastAt) || now - lastAt < STALE_MS) continue;

      const log = Array.isArray(call.tool_log) ? call.tool_log : [];
      const probeAt = Date.parse(lastEntryNamed(log, 'reattach_probe')?.at || '');
      const attachAt = Date.parse(lastEntryNamed(log, 'sideband_attached')?.at || '');
      // A re-attach is already in flight, or a worker attached moments ago and has
      // simply not written yet: leave the call to that worker.
      const inFlight = [probeAt, attachAt].some((at) => Number.isFinite(at) && now - at < PROBE_MARKER_MS);
      if (inFlight || !relayKey || !sessionId) {
        skipped.push(call.id);
        continue;
      }

      probed.push(call.id);
      if (dryRun) continue;
      // Issue #86 (3.4): the probe is only STARTED, never awaited — it now holds
      // its own request open for a 150-second slice, far beyond this sweep's
      // post-response lifetime. This sweep remains the net for a worker that dies
      // hard mid-slice with no successor scheduled.
      waitUntil(
        base44.asServiceRole.functions.invoke('smashieLiveHop', {
          relayKey,
          sessionId,
          conversationId: call.id,
          callerPhone: call.phone_number || '',
          counterPhone,
          state: {},
          probe: true,
          probeCount: 1,
        }).catch((err) => console.error(`Watchdog probe could not be launched for ${call.id}:`, err.message)),
      );
    }

    console.log(`Smashie live watchdog${dryRun ? ' (dry run)' : ''}: ${probed.length} re-attach probe(s), ${finalized.length} closed at the cap, ${skipped.length} skipped.`);
    return Response.json({
      ok: true,
      dry_run: dryRun,
      probed,
      finalized,
      skipped,
      active_scanned: (active || []).length,
      checked_at: new Date(now).toISOString(),
    });
  } catch (error) {
    console.error('smashieLiveWatchdog error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}