import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { lookupCustomerByPhone } from '../../shared/squareCustomer.ts';

// Admin-only: resolve a caller's phone number to a Square customer name and
// persist it on the SmsConversation record so the Phone Log shows who called.
// Used for on-demand resolution of older call records that predate the
// automatic status-callback lookup.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { conversation_id, phone } = body || {};
    if (!conversation_id || !phone) {
      return Response.json({ error: 'conversation_id and phone are required' }, { status: 400 });
    }

    const cust = await lookupCustomerByPhone(base44, phone);
    if (cust) {
      await base44.asServiceRole.entities.SmsConversation.update(conversation_id, {
        customer_name: cust.name,
        square_customer_id: cust.id,
      });
    }

    return Response.json({ found: !!cust, name: cust?.name || null });
  } catch (error) {
    console.error('lookupCaller error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}