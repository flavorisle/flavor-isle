import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { sendPushToSubscriptions } from '../../shared/sendPush.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const { title, body, url } = await req.json();
    if (!body) return Response.json({ error: 'Missing message body' }, { status: 400 });

    const subs = await base44.asServiceRole.entities.PushSubscription.list();
    const diagnostics = [];

    const result = await sendPushToSubscriptions(base44, subs, {
      title: title || 'Flavor Isle',
      body,
      url: url || '/menu',
    });

    return Response.json({ success: true, sent: result.sent, subCount: subs.length, errors: result.errors });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}