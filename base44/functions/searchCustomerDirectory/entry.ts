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

      // Orders that belong to this person. The link is normalized phone first,
      // then the profile id, then email — the same rule every order is written
      // with, so nothing that belongs to them is left out of their history.
      const orderQuery = normalizedPhone
        ? { normalized_phone: normalizedPhone }
        : profile?.id
          ? { customer_id: profile.id }
          : { customer_email: email };
      const orders = await base44.asServiceRole.entities.Order
        .filter(orderQuery, { sort: '-created_date', limit: 25 })
        .catch(() => ({ items: [] }));

      return Response.json({
        ok: true,
        profile: profile || null,
        orders: orders?.items || [],
        orders_truncated: !!orders?.has_more,
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