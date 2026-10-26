import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { searchPulseCustomers, pulseConfigured, PULSE_NOT_CONFIGURED } from '../../shared/pulseDirectory.ts';

// The admin Customers directory (issue #96, section B).
//
// Admin-only. Two jobs:
//   { query }   → search the Pulse customer directory (the directory of record).
//   { customer } → one person's profile plus their order history from this app.
//
// It never invents a customer: an unreachable or unconfigured Pulse directory
// comes back as a plain reason the page can show, not as an empty list that
// would read as "no such customer".
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.error) return auth.error;

    const body = await req.json().catch(() => ({}));

    // ── One person's history ──
    const customer = body?.customer;
    if (customer) {
      const normalizedPhone = String(customer.normalized_phone || '').replace(/[^\d+]/g, '');
      const email = String(customer.email || '').trim().toLowerCase();
      const profileId = String(customer.profile_id || customer.pulse_customer_id || '');

      // The profile of record on our side: by id, then by email, then by phone.
      let profile = null;
      try {
        if (profileId) {
          profile = await base44.asServiceRole.entities.CustomerProfile.get(profileId).catch(() => null);
        }
        if (!profile && email) {
          const byEmail = await base44.asServiceRole.entities.CustomerProfile.filter({ email });
          profile = byEmail?.[0] || null;
        }
      } catch (profileErr) {
        console.warn('Customer profile lookup failed:', (profileErr as Error).message);
      }

      // Orders that belong to this person (issue #123 B2). Checkout never wrote
      // the local profile id, so a single-key lookup matched nothing. Every key
      // an order can carry is queried instead — normalized phone, email, and the
      // profile id when one exists — then merged, deduped and sorted newest
      // first. filter(query, sort, limit) returns an array on the server SDK.
      const candidateKeys = [
        { value: normalizedPhone, query: (key: string) => ({ normalized_phone: key }) },
        { value: email, query: (key: string) => ({ customer_email: key }) },
        { value: profile?.id ? String(profile.id) : '', query: (key: string) => ({ customer_id: key }) },
      ].filter((entry) => entry.value);

      const matched: any[] = [];
      for (const entry of candidateKeys) {
        const rows = await base44.asServiceRole.entities.Order
          .filter(entry.query(entry.value), '-created_date', 25)
          .catch(() => []);
        if (Array.isArray(rows)) matched.push(...rows);
      }

      const byId = new Map();
      matched.forEach((order) => {
        if (order?.id && !byId.has(order.id)) byId.set(order.id, order);
      });
      // Merged set before the display cap — the stats are computed from this.
      const allMatched = [...byId.values()].sort(
        (a, b) => new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()
      );
      const orders = allMatched.slice(0, 25);

      const inStore = allMatched.filter((order) => order.order_source === 'in_store');
      const online = allMatched.filter((order) => order.order_source !== 'in_store');
      const sumSpent = (rows: any[]) =>
        Number(
          rows
            .filter((order) => order.status !== 'cancelled')
            .reduce((sum, order) => sum + (Number(order.total) || 0), 0)
            .toFixed(2)
        );
      const dates = allMatched.map((order) => order.created_date).filter(Boolean).sort();
      const stats = {
        online_orders: online.length,
        online_total_spent: sumSpent(online),
        in_store_orders: inStore.length,
        in_store_total_spent: sumSpent(inStore),
        first_order_date: dates[0] || '',
        last_order_date: dates[dates.length - 1] || '',
      };

      return Response.json({
        ok: true,
        profile: profile || null,
        orders,
        orders_truncated: allMatched.length >= 25,
        stats,
      });
    }

    // ── Directory search ──
    const query = String(body?.query || '').trim();
    const limit = Math.min(Math.max(Number(body?.limit) || 25, 1), 50);

    if (!pulseConfigured()) {
      return Response.json({ ok: false, directory: [], directory_error: PULSE_NOT_CONFIGURED });
    }

    try {
      const directory = await searchPulseCustomers(query, limit);
      return Response.json({ ok: true, directory, directory_error: null, pulse_connected: true });
    } catch (error) {
      console.error('Pulse directory search failed:', (error as Error).message);
      return Response.json({
        ok: false,
        directory: [],
        directory_error: `The Pulse customer directory could not be reached: ${(error as Error).message}`,
        pulse_connected: true,
      });
    }
  } catch (error) {
    console.error('searchCustomerDirectory error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}