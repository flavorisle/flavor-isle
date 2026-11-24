import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { closeIfDue, groupView } from '../../shared/groupOrderView.ts';
import { cleanCode, findGroup } from '../../shared/groupOrderAccess.ts';

// Take one line back off the group (issue #356). Allowed while the group is open;
// a paid group is locked.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const code = cleanCode(body?.code);
    const lineId = String(body?.line_id || '').trim();

    if (!code || !lineId) return Response.json({ error: 'That item could not be found.' }, { status: 400 });

    const existing = await findGroup(base44, code);
    if (!existing) return Response.json({ error: 'We could not find that group. Check the link and try again.' }, { status: 404 });

    const group = await closeIfDue(base44, existing);
    if (group.status === 'paid') return Response.json({ error: 'This group has already been paid, so its items are locked.' }, { status: 409 });
    if (group.status !== 'open') return Response.json({ error: 'This group has closed and its items are locked.' }, { status: 409 });

    const matches = await base44.asServiceRole.entities.GroupOrderLine.filter({ id: lineId, group_order_id: group.id });
    if (!matches || matches.length === 0) {
      return Response.json({ error: 'That item is not on this group.' }, { status: 404 });
    }
    await base44.asServiceRole.entities.GroupOrderLine.delete(matches[0].id);

    const view = await groupView(base44, group);
    return Response.json({ ok: true, ...view });
  } catch (error) {
    console.error('removeGroupOrderLine error:', (error as Error).message);
    return Response.json({ error: 'That item could not be removed. Please try again.' }, { status: 500 });
  }
}