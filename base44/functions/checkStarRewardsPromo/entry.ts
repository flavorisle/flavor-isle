import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { findLoyaltyAccountByEmail } from '../../shared/squareLoyalty.ts';

// Star Rewards October Promo — $5 off every online order for loyalty members,
// once per calendar day, Oct 1–31 2026 (America/Chicago). Auto-starts and
// auto-stops based on the date check below; no manual toggle needed.

const PROMO_START = new Date('2026-10-01T00:00:00-05:00'); // CDT
const PROMO_END = new Date('2026-11-01T00:00:00-05:00');   // CDT (Nov 1 = promo over)
const DISCOUNT_AMOUNT = 5.0;
const MIN_SUBTOTAL = 15.0;

const SKIP_EMAILS = new Set([
  'square-pos@flavorisle.com',
  'wesley@flavor-isle.com',
  'wesleyrbooker1@gmail.com',
  'test@example.com',
]);

function isSkipEmail(email: string): boolean {
  if (!email) return true;
  const e = email.toLowerCase().trim();
  if (SKIP_EMAILS.has(e)) return true;
  if (e.endsWith('@flavorisle.com')) return true;
  return false;
}

// Returns the current time in America/Chicago as a Date object, accounting for
// CST (UTC-6) vs CDT (UTC-5). Deno's Intl supports timeZone, so we format the
// current instant in Chicago and parse it back.
function chicagoNow(): Date {
  const s = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
  return new Date(s);
}

function isPromoActive(): boolean {
  const now = chicagoNow();
  return now >= PROMO_START && now < PROMO_END;
}

// Start of today (midight) in America/Chicago, as a UTC Date.
function chicagoStartOfDay(): Date {
  const now = chicagoNow();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const { email, subtotal } = await req.json();

    if (!email) {
      return Response.json({ eligible: false, reason: 'no_email' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Date window check (auto-start, auto-stop)
    if (!isPromoActive()) {
      return Response.json({ eligible: false, reason: 'not_in_promo_window' });
    }

    // 2. Exclude test/internal accounts
    if (isSkipEmail(cleanEmail)) {
      return Response.json({ eligible: false, reason: 'skip_email' });
    }

    // 3. Subtotal minimum ($15+ before discount)
    const sub = Number(subtotal) || 0;
    if (sub < MIN_SUBTOTAL) {
      return Response.json({
        eligible: false,
        reason: 'subtotal_too_low',
        message: `Add $${(MIN_SUBTOTAL - sub).toFixed(2)} more to unlock your $5 Star Rewards discount.`,
      });
    }

    // 4. Must have an active Square loyalty account (loyalty member)
    let phone: string | null = null;
    try {
      const profiles = await base44.asServiceRole.entities.CustomerProfile.filter({ email: cleanEmail });
      phone = profiles?.[0]?.phone || null;
    } catch { /* ignore — try email-only lookup */ }

    let loyaltyAccount: any = null;
    try {
      loyaltyAccount = await findLoyaltyAccountByEmail({ email: cleanEmail, phone: phone || undefined });
    } catch (err) {
      console.error('Loyalty lookup failed:', (err as Error).message);
    }

    if (!loyaltyAccount) {
      return Response.json({
        eligible: false,
        reason: 'not_a_member',
        message: 'Join Star Rewards free at checkout to get $5 off every order in October.',
      });
    }

    // 5. Once per calendar day — check for an existing order today with the promo
    const startOfToday = chicagoStartOfDay();
    try {
      const recentOrders = await base44.asServiceRole.entities.Order.filter({
        customer_email: cleanEmail,
        promo_applied: 'star_rewards',
      }, '-created_date', 50);

      const alreadyUsedToday = (recentOrders || []).some((o: any) =>
        new Date(o.created_date) >= startOfToday
      );

      if (alreadyUsedToday) {
        return Response.json({
          eligible: false,
          reason: 'already_used_today',
          alreadyUsed: true,
          message: 'Star Rewards applied to your first order today — back again tomorrow 🍦',
        });
      }
    } catch (err) {
      console.error('Promo usage check failed:', (err as Error).message);
      // If we can't check, allow the discount — better to give it than block it.
    }

    return Response.json({
      eligible: true,
      discountAmount: DISCOUNT_AMOUNT,
      promoCode: 'star_rewards',
    });
  } catch (error) {
    console.error('checkStarRewardsPromo error:', error.message);
    return Response.json({ eligible: false, reason: 'error', message: error.message }, { status: 500 });
  }
}