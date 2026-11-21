import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { normalizePhone } from '../../shared/normalizePhone.ts';
import { todayChicago, chicagoParts } from '../../shared/busynessTime.ts';

// Issue #325 Part 2: the customer dashboard's numbers, computed from OUR OWN
// records — CustomerProfile and Order. Pulse is never consulted.
//
// "A purchase" is a paid or completed order in either channel; a cancelled or
// unpaid order never counts, so a lapsed segment means a customer who has not
// actually bought anything. Lifetime total is the sum of those same orders.
const PAID_STATUSES = new Set(['completed', 'delivered']);
const PAGE = 500;

function qualifies(order: any): boolean {
  if (!order || order.status === 'cancelled') return false;
  if (order.payment_status === 'paid') return true;
  return PAID_STATUSES.has(order.status);
}

function dayNumber(dateKey: string): number | null {
  const parts = String(dateKey || '').split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return Math.floor(Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000);
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.error) return auth.error;

    const profiles: any[] = [];
    for (let page = 0; page < 40; page++) {
      const rows = await base44.asServiceRole.entities.CustomerProfile
        .filter({}, '-created_date', PAGE, page * PAGE)
        .catch(() => []);
      const items = Array.isArray(rows) ? rows : [];
      profiles.push(...items);
      if (items.length < PAGE) break;
    }

    const orders: any[] = [];
    for (let page = 0; page < 40; page++) {
      const rows = await base44.asServiceRole.entities.Order
        .filter({}, '-created_date', PAGE, page * PAGE)
        .catch(() => []);
      const items = Array.isArray(rows) ? rows : [];
      orders.push(...items);
      if (items.length < PAGE) break;
    }

    const byPhone = new Map<string, any>();
    const byEmail = new Map<string, any>();
    for (const profile of profiles) {
      const phone = normalizePhone(profile.phone);
      if (phone && !byPhone.has(phone)) byPhone.set(phone, profile);
      const email = String(profile.email || '').trim().toLowerCase();
      if (email && !byEmail.has(email)) byEmail.set(email, profile);
    }

    const stats = new Map<string, { lastKey: string; channels: Set<string>; total: number; orders: number }>();
    for (const order of orders) {
      if (!qualifies(order)) continue;
      const phone = order.normalized_phone || normalizePhone(order.customer_phone);
      const email = String(order.customer_email || '').trim().toLowerCase();
      const profile = (phone && byPhone.get(phone)) || (email && byEmail.get(email));
      if (!profile?.id) continue;

      const dateKey = chicagoParts(order.created_date).dateKey;
      const entry = stats.get(profile.id) || { lastKey: '', channels: new Set<string>(), total: 0, orders: 0 };
      if (dateKey > entry.lastKey) entry.lastKey = dateKey;
      entry.channels.add(order.order_source === 'in_store' ? 'in_store' : 'online');
      entry.total += Number(order.total) || 0;
      entry.orders += 1;
      stats.set(profile.id, entry);
    }

    const todayKey = todayChicago().dateKey;
    const todayNumber = dayNumber(todayKey) ?? 0;
    const monthKey = todayKey.slice(0, 7);

    let inStore = 0;
    let online = 0;
    let newThisMonth = 0;
    for (const profile of profiles) {
      const entry = stats.get(profile.id);
      if (entry?.channels.has('in_store')) inStore += 1;
      if (entry?.channels.has('online')) online += 1;
      if (chicagoParts(profile.created_date).dateKey.slice(0, 7) === monthKey) newThisMonth += 1;
    }

    const buckets: Record<string, any[]> = { d30: [], d60: [], d180: [] };
    for (const profile of profiles) {
      const entry = stats.get(profile.id);
      if (!entry?.lastKey) continue;
      const lastNumber = dayNumber(entry.lastKey);
      if (lastNumber == null) continue;
      const days = todayNumber - lastNumber;
      if (days < 30) continue;

      const channel = entry.channels.size > 1
        ? 'Both'
        : entry.channels.has('in_store') ? 'In-store' : 'Online';
      const row = {
        id: profile.id,
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        last_purchase: entry.lastKey,
        days_since: days,
        channel,
        lifetime_total: Math.round((entry.total + Number.EPSILON) * 100) / 100,
        orders: entry.orders,
      };
      if (days < 60) buckets.d30.push(row);
      else if (days < 180) buckets.d60.push(row);
      else buckets.d180.push(row);
    }

    const segment = (rows: any[]) => ({
      count: rows.length,
      customers: rows
        .sort((a, b) => b.days_since - a.days_since || b.lifetime_total - a.lifetime_total)
        .slice(0, 500),
    });

    return Response.json({
      totals: {
        customers: profiles.length,
        in_store: inStore,
        online,
        new_this_month: newThisMonth,
      },
      segments: {
        d30: segment(buckets.d30),
        d60: segment(buckets.d60),
        d180: segment(buckets.d180),
      },
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('getCustomerInsights failed:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}