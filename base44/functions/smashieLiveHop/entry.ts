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
// Called only by smashieSipIncoming (first hop) and by the previous hop. The
// relay key in the payload is what proves the call came from inside the app.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { driveLiveHop } from '../../shared/smashieLiveSession.ts';

// Safety net for a call that never ends: 75 hops is about fifteen minutes.
const MAX_HOPS = 75;

export default async function (req) {
  try {
    const body = await req.json().catch(() => ({}));
    const relayKey = Deno.env.get('OPENAI_WEBHOOK_SECRET');
    if (!relayKey || body.relayKey !== relayKey) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    const { sessionId, conversationId, callerPhone, counterPhone, greeting, state } = body;
    if (!apiKey || !sessionId || !conversationId) {
      return Response.json({ error: 'Missing session details' }, { status: 400 });
    }
    if ((state?.hop || 0) >= MAX_HOPS) {
      return Response.json({ error: 'Hop limit reached' }, { status: 429 });
    }

    const base44 = createClientFromRequest(req);
    let announceAttached;
    const attached = new Promise((resolve) => { announceAttached = resolve; });

    const drive = driveLiveHop({
      base44,
      sessionId,
      apiKey,
      conversationId,
      callerPhone,
      counterPhone: counterPhone || '',
      // Only the first hop greets: a later hop must never re-introduce Smashie.
      greeting: state?.hop ? '' : greeting,
      state: state || {},
      onAttached: () => announceAttached(true),
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
        return !!(data && data.attached);
      },
    });
    waitUntil(drive);

    // Answer as soon as this hop's socket is live — or as soon as it has given
    // up attaching. Waiting on the attach alone left this request hanging
    // forever when the attach failed, and the previous hop's handoff hung with
    // it instead of retrying (issue #81).
    const isAttached = await Promise.race([attached, drive.then(() => false, () => false)]);
    return Response.json({ attached: isAttached });
  } catch (error) {
    console.error('smashieLiveHop error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}