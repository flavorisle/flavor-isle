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
    const { conversation_id, conversation_ids } = body || {};
    const ids = conversation_ids || (conversation_id ? [conversation_id] : []);
    if (!Array.isArray(ids) || !ids.length || ids.length > 20 || ids.some(id => typeof id !== 'string')) {
      return Response.json({ error: 'Provide 1–20 conversation IDs' }, { status: 400 });
    }
    const records = await base44.asServiceRole.entities.SmsConversation.filter({ id: { $in: ids }, channel: 'voice' });
    const customers = new Map();
    const results = [];
    for (const record of records) {
      const phone = record.phone_number;
      if (!customers.has(phone)) customers.set(phone, await lookupCustomerByPhone(base44, phone));
      const cust = customers.get(phone);
      const details = cust ? { customer_name: cust.name, square_customer_id: cust.id, customer_email: cust.email } : {};
      if (cust) await base44.asServiceRole.entities.SmsConversation.update(record.id, details);
      results.push({ id: record.id, found: !!cust, ...details });
    }
    const first = results[0];
    return Response.json({ found: first?.found || false, name: first?.customer_name || null, customer_email: first?.customer_email || null, square_customer_id: first?.square_customer_id || null, results });
  } catch (error) {
    console.error('lookupCaller error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}