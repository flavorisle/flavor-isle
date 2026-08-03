import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { endpoint, keys } = await req.json();
    if (!endpoint) return Response.json({ error: 'Missing endpoint' }, { status: 400 });

    // Upsert by endpoint — a browser can re-subscribe with the same endpoint.
    const existing = await base44.asServiceRole.entities.PushSubscription.filter({ endpoint });
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.PushSubscription.update(existing[0].id, {
        keys,
        user_id: user.id,
        email: user.email,
      });
    } else {
      await base44.asServiceRole.entities.PushSubscription.create({
        endpoint,
        keys,
        user_id: user.id,
        email: user.email,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}