// Issue #325 Part 3 — win-back promo codes, online only.
//
// One place decides whether a code applies and what it takes off, so the two
// checkout functions and the checkout page's own check can never disagree. The
// dollar amount is always computed here from the code record: the browser sends
// a code, never an amount.
import { normalizePhone } from './normalizePhone.ts';

export function normalizePromoCode(raw: any): string {
  return String(raw || '').trim().toUpperCase();
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export async function findPromoCode(base44: any, code: any): Promise<any | null> {
  const normalized = normalizePromoCode(code);
  if (!normalized) return null;
  const rows = await base44.asServiceRole.entities.PromoCode
    .filter({ code: normalized })
    .catch(() => []);
  const list = Array.isArray(rows) ? rows : [];
  return list.find((row: any) => normalizePromoCode(row?.code) === normalized) || null;
}

// How many orders this customer has already placed with the code, counted from
// our own Order records — never from anything the browser sends. A cancelled or
// failed order does not count against them.
export async function promoUsesForCustomer(
  base44: any,
  code: any,
  { email, phone }: { email?: string; phone?: string } = {},
): Promise<number> {
  const normalized = normalizePromoCode(code);
  if (!normalized) return 0;

  const seen = new Set<string>();
  const emailKeys = [...new Set(
    [String(email || '').trim(), String(email || '').trim().toLowerCase()].filter(Boolean),
  )];
  const phoneKey = normalizePhone(phone);

  const queries: Record<string, any>[] = emailKeys.map((key) => ({
    promo_code: normalized,
    customer_email: key,
  }));
  if (phoneKey) queries.push({ promo_code: normalized, normalized_phone: phoneKey });

  for (const query of queries) {
    const rows = await base44.asServiceRole.entities.Order.filter(query).catch(() => []);
    for (const order of (Array.isArray(rows) ? rows : [])) {
      if (!order?.id) continue;
      if (order.status === 'cancelled' || order.payment_status === 'failed') continue;
      seen.add(order.id);
    }
  }
  return seen.size;
}

export interface PromoResult {
  ok: boolean;
  error?: string;
  code?: string;
  promo?: any;
  percent_off?: number;
  discount?: number;
}

export async function validatePromoCode(
  base44: any,
  { code, subtotal, email, phone, now = new Date() }: {
    code?: string;
    subtotal?: number;
    email?: string;
    phone?: string;
    now?: Date;
  } = {},
): Promise<PromoResult> {
  const normalized = normalizePromoCode(code);
  if (!normalized) return { ok: false, error: 'Enter a promo code.' };

  const promo = await findPromoCode(base44, normalized);
  if (!promo) return { ok: false, error: 'That promo code is not valid.' };
  if (promo.is_active !== true) return { ok: false, error: 'That promo code is not active right now.' };
  if (!promo.expires_at) return { ok: false, error: 'That promo code is not active yet.' };

  if (promo.expires_at) {
    const expires = new Date(promo.expires_at).getTime();
    if (Number.isFinite(expires) && expires < now.getTime()) {
      return { ok: false, error: 'That promo code has expired.' };
    }
  }

  const max = Number(promo.max_redemptions) || 0;
  if (max > 0 && (Number(promo.times_redeemed) || 0) >= max) {
    return { ok: false, error: 'That promo code has been fully redeemed.' };
  }

  const base = Math.max(0, Number(subtotal) || 0);
  const min = Number(promo.min_subtotal) || 0;
  if (min > 0 && base < min) {
    return { ok: false, error: `That code needs a subtotal of at least $${min.toFixed(2)}.` };
  }

  const limit = Number(promo.per_customer_limit) || 0;
  if (limit > 0) {
    const used = await promoUsesForCustomer(base44, normalized, { email, phone });
    if (used >= limit) {
      return { ok: false, error: 'That promo code has already been used on this account.' };
    }
  }

  const percent = Math.max(0, Math.min(100, Number(promo.percent_off) || 0));
  const discount = round2(Math.min(base, (base * percent) / 100));
  if (discount <= 0) {
    return { ok: false, error: 'That promo code does not take anything off this order.' };
  }

  return { ok: true, code: normalized, promo, percent_off: percent, discount };
}

// ── Win-back code window (issue #325) ──
// The approved wording is "21 days from send", so the clock starts when a code
// is actually sent to a customer, never when the record was created. A code is
// armed for its segment in the same step that sends the email, before it goes
// out; until then the record carries no live window of its own.
export const WINBACK_CODE_DAYS = 21;

// Which win-back segment a customer falls in, from the age of their last order:
// d30 (30-59 days), d60 (60-179) or d180 (180+).
export function winbackSegmentFor(lastOrderAt: any, now: Date = new Date()): 'd30' | 'd60' | 'd180' {
  const at = new Date(lastOrderAt).getTime();
  if (!Number.isFinite(at)) return 'd30';
  const days = Math.floor((now.getTime() - at) / (24 * 60 * 60 * 1000));
  if (days < 60) return 'd30';
  if (days < 180) return 'd60';
  return 'd180';
}

// Sets the segment's code to expire 21 days from this moment. Returns the armed
// record, or null when the code could not be found or written — the caller must
// then send nothing, so no customer ever receives a code whose clock did not
// start.
export async function armWinbackCodeForSegment(
  base44: any,
  segment: string,
  now: Date = new Date(),
): Promise<any | null> {
  try {
    const rows = await base44.asServiceRole.entities.PromoCode.filter({ segment }).catch(() => []);
    const promo = (Array.isArray(rows) ? rows : []).find((row: any) => row?.segment === segment) || null;
    if (!promo?.id) return null;
    const expires_at = new Date(now.getTime() + WINBACK_CODE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    await base44.asServiceRole.entities.PromoCode.update(promo.id, { expires_at });
    return { ...promo, expires_at };
  } catch (error) {
    console.error('Win-back code arming failed:', (error as Error).message);
    return null;
  }
}

// A redemption is counted only once the order is actually paid, and the count is
// recomputed from the paid orders themselves rather than incremented: a re-run
// cannot double-count, and an abandoned, cancelled or failed order never holds a
// customer's one use. Call this from the paid fulfillment path, never at order
// creation.
export async function recordPromoRedemption(base44: any, order: any): Promise<void> {
  const code = normalizePromoCode(order?.promo_code);
  if (!code) return;
  if (order?.status === 'cancelled') return;
  if (order?.payment_status !== 'paid') return;
  try {
    const promo = await findPromoCode(base44, code);
    if (!promo?.id) return;
    const rows = await base44.asServiceRole.entities.Order.filter({ promo_code: code }).catch(() => []);
    const paid = (Array.isArray(rows) ? rows : []).filter((o: any) =>
      o?.id && o.payment_status === 'paid' && o.status !== 'cancelled',
    ).length;
    await base44.asServiceRole.entities.PromoCode.update(promo.id, { times_redeemed: paid });
  } catch (error) {
    console.error('Promo redemption count failed:', (error as Error).message);
  }
}