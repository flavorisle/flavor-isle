import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Public one-click unsubscribe. Called by the /unsubscribe page when the
// subscriber clicks the unsubscribe link in any newsletter email. Sets
// status to unsubscribed and records the timestamp. The unsubscribe token
// is persistent (not single-use) so the link keeps working.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const token = body?.token;
    if (!token) return Response.json({ ok: false, error: 'token is required' }, { status: 400 });

    const subs = await base44.asServiceRole.entities.EmailSubscriber.filter({ unsubscribe_token: token });
    if (!subs[0]) return Response.json({ ok: false, error: 'invalid unsubscribe link' }, { status: 404 });

    const sub = subs[0];
    if (sub.status === 'unsubscribed') return Response.json({ ok: true, alreadyUnsubscribed: true });

    await base44.asServiceRole.entities.EmailSubscriber.update(sub.id, {
      status: 'unsubscribed',
      unsubscribed_at: new Date().toISOString(),
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}