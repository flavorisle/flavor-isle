import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { broadcastPush } from '../../shared/sendPush.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const { title, body, url } = await req.json();
    if (!body) return Response.json({ error: 'Missing message body' }, { status: 400 });

    const sent = await broadcastPush(base44, {
      title: title || 'Flavor Isle',
      body,
      url: url || '/menu',
    });

    return Response.json({ success: true, sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}