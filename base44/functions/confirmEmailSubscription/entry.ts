import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Public double opt-in confirmation. Called by the /confirm-subscription
// page when the subscriber clicks the confirm link in the email. Activates
// the subscription and clears the single-use confirm token.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const token = body?.token;
    if (!token) return Response.json({ ok: false, error: 'token is required' }, { status: 400 });

    const subs = await base44.asServiceRole.entities.EmailSubscriber.filter({ confirm_token: token });
    if (!subs[0]) return Response.json({ ok: false, error: 'invalid or expired confirmation link' }, { status: 404 });

    const sub = subs[0];
    if (sub.status === 'active') return Response.json({ ok: true, alreadyActive: true });

    await base44.asServiceRole.entities.EmailSubscriber.update(sub.id, {
      status: 'active',
      subscribed_at: new Date().toISOString(),
      confirm_token: null,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}