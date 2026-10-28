// Message consolidation (Oct 28 2026) — the single marketing cap shared by every
// automated loyalty email. A customer who ordered in the last 24 hours, or who
// already received an automated marketing email in the last 7 days, is skipped
// so the thank-you email is the only thing they hear from us after an order.
const MARKETING_TYPES = ['birthday', 'winback', 'digest', 'showcase', 'nudge'];

export async function canSendMarketingEmail(base44: any, email?: string) {
  if (!email) return { ok: false, reason: 'no email address' };
  const normalized = email.toLowerCase().trim();
  if (normalized.endsWith('@flavorisle.com')) return { ok: false, reason: 'internal address' };
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const orders = await base44.asServiceRole.entities.Order.filter({ customer_email: email });
    if ((orders || []).some((o) => o.created_date && o.created_date >= since24h)) {
      return { ok: false, reason: 'customer ordered in the last 24 hours' };
    }
  } catch (e) { console.error('Marketing cap order lookup failed, allowing send:', e.message); }
  try {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sent = await base44.asServiceRole.entities.LoyaltyEmail.filter({ customer_email: email });
    if ((sent || []).some((r) => MARKETING_TYPES.includes(r.email_type) && r.created_date && r.created_date >= since7d)) {
      return { ok: false, reason: 'marketing email already sent in the last 7 days' };
    }
  } catch (e) { console.error('Marketing cap log lookup failed, allowing send:', e.message); }
  return { ok: true };
}