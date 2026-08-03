import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const subs = await base44.asServiceRole.entities.PushSubscription.filter({ user_id: user.id });
    for (const s of subs) {
      await base44.asServiceRole.entities.PushSubscription.delete(s.id);
    }
    return Response.json({ success: true, removed: subs.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}