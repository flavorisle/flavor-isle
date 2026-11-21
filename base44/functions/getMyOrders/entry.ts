import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { normalizePhone } from '../../shared/normalizePhone.ts';

// Issue #325 Part 1: the signed-in customer's own orders, resolved on the
// server.
//
// In-store orders carry the email the customer's profile is linked to, which is
// not always the exact address on their site account — so the account page used
// to miss them. This returns the orders whose customer_email is the signed-in
// email OR whose normalized_phone is the phone on the signed-in customer's own
// CustomerProfile. That phone is resolved here, from the account email, never
// from the request.
//
// Order RLS is untouched: this reads with the service role but only ever
// returns the caller's own rows.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const email = String(user.email || '').trim();
    if (!email) return Response.json({ orders: [] });

    // The customer's own profile, matched on their account email. Both the
    // address exactly as stored on the account and its lowercase form are
    // tried, so a profile saved either way still resolves.
    const profiles = [];
    for (const key of [...new Set([email, email.toLowerCase()])]) {
      const rows = await base44.asServiceRole.entities.CustomerProfile
        .filter({ email: key })
        .catch(() => []);
      (Array.isArray(rows) ? rows : []).forEach((p) => profiles.push(p));
    }
    const phone = normalizePhone(profiles.find((p) => p?.phone)?.phone);

    const byId = new Map();
    const collect = (rows: any[]) => (Array.isArray(rows) ? rows : []).forEach((o) => {
      if (o?.id) byId.set(o.id, o);
    });

    for (const key of [...new Set([email, email.toLowerCase()])]) {
      collect(await base44.asServiceRole.entities.Order
        .filter({ customer_email: key }, '-created_date', 200)
        .catch(() => []));
    }
    if (phone) {
      collect(await base44.asServiceRole.entities.Order
        .filter({ normalized_phone: phone }, '-created_date', 200)
        .catch(() => []));
    }

    const orders = [...byId.values()].sort(
      (a: any, b: any) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime(),
    );

    return Response.json({ orders });
  } catch (error) {
    console.error('getMyOrders failed:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}