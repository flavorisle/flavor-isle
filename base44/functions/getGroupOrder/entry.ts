import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { closeIfDue, groupView } from '../../shared/groupOrderView.ts';

// The participant view of one group order (issue #356): the group, everyone's
// lines, and each person's running subtotal. No personal data beyond first names
// and the items they chose. The code is the only credential.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || '').trim().toLowerCase();
    if (!code) return Response.json({ error: 'That group link is missing its code.' }, { status: 400 });

    const found = await base44.asServiceRole.entities.GroupOrder.filter({ code });
    const existing = (found || [])[0];
    if (!existing) return Response.json({ error: 'We could not find that group. Check the link and try again.' }, { status: 404 });

    const group = await closeIfDue(base44, existing);
    const view = await groupView(base44, group);
    return Response.json({ ok: true, ...view });
  } catch (error) {
    console.error('getGroupOrder error:', (error as Error).message);
    return Response.json({ error: 'We could not open that group. Please try again.' }, { status: 500 });
  }
}