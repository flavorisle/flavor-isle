import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Called by the "Off-Hook Caller Alert" workflow whenever Smashie answers a new
// voice call. If the same number called within the last 15 minutes, it likely
// means the caller's phone is off the hook (or they keep redialing) — email the
// admins so someone can check. Alerts only on the 2nd call in the window so a
// stream of redials doesn't flood the inbox.
const WINDOW_MINUTES = 15;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { conversation_id, phone_number } = await req.json();

    if (!phone_number) {
      return Response.json({ alerted: false, reason: 'No phone number on this call.' });
    }

    // Recent voice calls from this same number.
    const recentCalls = await base44.asServiceRole.entities.SmsConversation.filter(
      { phone_number, channel: 'voice' },
      '-created_date',
      10
    );
    const windowStart = Date.now() - WINDOW_MINUTES * 60 * 1000;
    const priorCalls = (recentCalls || []).filter(
      (c) => c.id !== conversation_id && new Date(c.created_date).getTime() >= windowStart
    );

    if (priorCalls.length === 0) {
      return Response.json({ alerted: false, reason: 'First call from this number in the window.' });
    }
    if (priorCalls.length > 1) {
      return Response.json({ alerted: false, reason: 'Already alerted for this caller.' });
    }

    // 2nd call within the window — alert the admins.
    const current = recentCalls.find((c) => c.id === conversation_id);
    const callerName = current?.customer_name || priorCalls[0]?.customer_name || 'Unknown caller';
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });

    const timesList = [current, ...priorCalls]
      .filter(Boolean)
      .map((c) =>
        new Date(c.call_started_at || c.created_date).toLocaleString('en-US', {
          timeZone: 'America/Chicago',
          hour: 'numeric',
          minute: '2-digit',
          month: 'short',
          day: 'numeric',
        })
      )
      .join(', ');

    const body = [
      `Smashie answered ${phone_number} twice within ${WINDOW_MINUTES} minutes — the phone may be off the hook, or the caller keeps redialing without getting help.`,
      '',
      `Caller: ${callerName}`,
      `Number: ${phone_number}`,
      `Call times (Central): ${timesList}`,
      '',
      'You can review the full call transcripts in the admin Communications page.',
    ].join('\n');

    await Promise.all(
      (admins || []).map((a) =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: a.email,
          subject: `⚠️ Repeat caller alert: ${phone_number} called twice in ${WINDOW_MINUTES} min`,
          body,
          from_name: 'Flavor Isle Alerts',
        })
      )
    );

    return Response.json({ alerted: true, admins_notified: (admins || []).length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}