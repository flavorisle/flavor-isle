import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { sendPushToSubscriptions } from '../../shared/sendPush.ts';
import { readAllRecords } from '../../shared/readAll.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const { title, body, url } = await req.json();
    if (!body) return Response.json({ error: 'Missing message body' }, { status: 400 });

    // A broadcast must reach every subscriber, so page through the whole table.
    const subs = await readAllRecords((options) =>
      base44.asServiceRole.entities.PushSubscription.list(options));
    const diagnostics = [];

    const result = await sendPushToSubscriptions(base44, subs, {
      title: title || 'Flavor Isle',
      body,
      url: url || '/menu',
    });

    const errorCount = (result.errors || []).length;
    const status = result.sent > 0 ? (errorCount > 0 ? 'partial' : 'sent') : 'failed';
    try {
      await base44.asServiceRole.entities.PushLog.create({
        title: title || 'Flavor Isle',
        body,
        url: url || '/menu',
        sent_count: result.sent,
        recipient_count: subs.length,
        error_count: errorCount,
        status,
      });
    } catch (logErr) {
      console.error('PushLog create failed:', logErr.message);
    }

    return Response.json({ success: true, sent: result.sent, subCount: subs.length, errors: result.errors });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}