import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { Resend } from 'npm:resend@3.2.0';
import { buildCartReminderHtml } from '../../shared/cartReminderEmail.ts';
import { loadBlockFilter } from '../../shared/blockedContacts.ts';
import { canSendMarketingEmail } from '../../shared/messagePolicy.ts';

// Scans CustomerProfiles for saved carts that have sat untouched for more than
// one hour and sends each customer one compelling reminder email. Invoked by the
// "Cart Abandonment Reminders" scheduled workflow (every 30 minutes), so all
// entity work runs as the service role.
//
// Eligibility for a given profile:
//   1. cart.cartItems is a non-empty array (there's something to recover).
//   2. cart.savedAt is older than one hour (the cart is genuinely abandoned,
//      not being actively built — every cart change refreshes savedAt).
//   3. The cart's fingerprint differs from cart_reminder_cart_key — one reminder
//      per abandoned cart, no matter how many runs see it (issue #160).
//   4. No cart reminder for this address in the last 7 days (hard ceiling,
//      recorded as a LoyaltyEmail row with email_type 'cart').
//   5. The customer is not owner/staff — the crew's own carts are never emailed.
//
// After a successful send, cart_reminder_sent_at and cart_reminder_cart_key are
// stamped and a LoyaltyEmail row is written.
const ONE_HOUR_MS = 60 * 60 * 1000;
const CART_CEILING_MS = 7 * 24 * 60 * 60 * 1000;
const FROM = 'Flavor Isle <smashie@flavor-isle.com>';

// The owner and the crew, by address. Everything on our own domains is staff
// too, and any admin account's email is added at run time.
const STAFF_EMAILS = new Set([
  'wesleyrbooker1@gmail.com',
  'wesley@flavor-isle.com',
  'ashleybooker29@gmail.com',
]);

// Stable across runs: sorted itemId|quantity|modifier ids entries.
function cartFingerprint(items) {
  return (items || [])
    .map((i) => {
      const itemId = i.productId || i.id || '';
      const mods = (i.selectedModifiers || []).map((m) => m.id || m.name).sort().join(',');
      return `${itemId}|${Number(i.quantity) || 1}|${mods}`;
    })
    .sort()
    .join(';');
}

const normalize = (email) => String(email || '').toLowerCase().trim();

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    // Carts are only saved for authenticated users, and every cart change bumps
    // updated_date, so the most-recently-updated profiles hold every active or
    // recently-abandoned cart. 500 is plenty for a single-location restaurant.
    const profiles = await base44.asServiceRole.entities.CustomerProfile.list('-updated_date', 500);

    // Issue #93 (A13): blocked customers are never reminded. This flow sends
    // email only — there is no SMS reminder step to filter. The block list is
    // read once per run; a failed read is logged and the run continues.
    const blockFilter = await loadBlockFilter(base44).catch((e) => {
      console.error('Block-list lookup failed, sending unfiltered:', e.message);
      return null;
    });

    // Admin accounts are staff — their saved carts never trigger a reminder.
    const staffEmails = new Set(STAFF_EMAILS);
    try {
      const users = await base44.asServiceRole.entities.User.list();
      for (const u of (users || [])) {
        if (u?.role === 'admin' && u?.email) staffEmails.add(normalize(u.email));
      }
    } catch (e) {
      console.error('Admin lookup failed, using the fixed staff list only:', e.message);
    }
    const isStaff = (email) => {
      const e = normalize(email);
      if (!e) return false;
      return staffEmails.has(e) || e.endsWith('@flavorisle.com') || e.endsWith('@flavor-isle.com');
    };

    // Hard 7-day ceiling, read once: any cart reminder already sent this week.
    const now = Date.now();
    const recentlyReminded = new Set();
    try {
      const cartRows = await base44.asServiceRole.entities.LoyaltyEmail.filter({ email_type: 'cart' }, '-created_date', 500);
      for (const r of (cartRows || [])) {
        const at = new Date(r.sent_at || r.created_date || 0).getTime();
        if (at && now - at < CART_CEILING_MS) recentlyReminded.add(normalize(r.customer_email));
      }
    } catch (e) {
      console.error('Cart reminder log lookup failed, sending without the 7-day ceiling:', e.message);
    }

    const reminded = [];
    let skipped = 0;
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    for (const p of (profiles || [])) {
      const cart = p.cart;
      if (!cart || !Array.isArray(cart.cartItems) || cart.cartItems.length === 0) continue;
      // Issue #93 (A13): a blocked customer is never reminded.
      if (blockFilter && (blockFilter.hasEmail(p.email) || blockFilter.hasPhone(p.phone))) continue;

      // Owner/staff carts are never emailed (issue #160).
      if (isStaff(p.email)) {
        skipped++;
        reminded.push({ email: p.email, status: 'staff_skipped', reason: 'owner or staff address' });
        continue;
      }

      const savedAt = Number(cart.savedAt) || 0;
      if (!savedAt) continue;
      if (now - savedAt < ONE_HOUR_MS) continue; // not idle long enough yet

      // One reminder per abandoned cart: same fingerprint as last time = done.
      const fingerprint = cartFingerprint(cart.cartItems);
      if (p.cart_reminder_cart_key && p.cart_reminder_cart_key === fingerprint) {
        skipped++;
        reminded.push({ email: p.email, status: 'same_cart', reason: 'already reminded for this cart' });
        continue;
      }

      // Hard ceiling: never more than one cart reminder per address in 7 days.
      if (recentlyReminded.has(normalize(p.email))) {
        skipped++;
        reminded.push({ email: p.email, status: 'seven_day_ceiling', reason: 'cart reminder already sent in the last 7 days' });
        continue;
      }

      // Message consolidation cap: no marketing email within 24 hours of an
      // order, and only one automated marketing email per 7 days. A capped cart
      // is NOT stamped, so it can still fire once the customer is eligible.
      const policy = await canSendMarketingEmail(base44, p.email);
      if (!policy.ok) {
        console.log(`Marketing skip for ${p.email}: ${policy.reason}`);
        skipped++;
        reminded.push({ email: p.email, status: 'marketing_cap', reason: policy.reason });
        continue;
      }

      const lastReminderMs = p.cart_reminder_sent_at ? new Date(p.cart_reminder_sent_at).getTime() : 0;
      // Skip if we already reminded for this (or a later) version of the cart.
      if (lastReminderMs && savedAt <= lastReminderMs) continue;

      const items = cart.cartItems;
      const subtotal = items.reduce(
        (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1),
        0,
      );

      try {
        const html = await buildCartReminderHtml(base44, p.name, items, subtotal);
        const { error } = await resend.emails.send({
          from: FROM,
          to: p.email,
          subject: `🔥 Your bag's getting cold, ${p.name?.split(/\s+/)[0] || 'friend'} — the grill's still hot!`,
          html,
        });
        if (error) throw new Error(error.message || 'send failed');
      } catch (emailErr) {
        // Don't stamp the reminder if the email didn't go out — try again next run.
        reminded.push({ email: p.email, status: 'email_failed', error: emailErr.message });
        continue;
      }

      const sentAt = new Date().toISOString();
      await base44.asServiceRole.entities.CustomerProfile.update(p.id, {
        cart_reminder_sent_at: sentAt,
        cart_reminder_cart_key: fingerprint,
      });
      // Doubles as the 7-day ceiling check and the shared marketing cap record.
      await base44.asServiceRole.entities.LoyaltyEmail.create({
        email_type: 'cart',
        customer_email: p.email,
        sent_at: sentAt,
      });
      recentlyReminded.add(normalize(p.email));
      reminded.push({ email: p.email, status: 'sent' });
    }

    return Response.json({
      checked: (profiles || []).length,
      reminded_count: reminded.filter((r) => r.status === 'sent').length,
      skipped,
      details: reminded,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}