import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { Resend } from 'npm:resend@3.2.0';
import { buildCartReminderHtml } from '../../shared/cartReminderEmail.ts';

// Scans CustomerProfiles for saved carts that have sat untouched for more than
// one hour and sends each customer one compelling reminder email. Invoked by the
// "Cart Abandonment Reminders" scheduled workflow (every 30 minutes), so all
// entity work runs as the service role.
//
// Eligibility for a given profile:
//   1. cart.cartItems is a non-empty array (there's something to recover).
//   2. cart.savedAt is older than one hour (the cart is genuinely abandoned,
//      not being actively built — every cart change refreshes savedAt).
//   3. Either no reminder has ever been sent, OR the cart was modified after
//      the last reminder (savedAt > cart_reminder_sent_at). This means a
//      customer who returns, edits their cart, and leaves again becomes
//      eligible for one more reminder after another hour — but a customer
//      who ignores the reminder never gets spammed repeatedly for the same
//      idle cart.
//
// After sending, cart_reminder_sent_at is stamped so the same idle cart can't
// trigger a second reminder.
const ONE_HOUR_MS = 60 * 60 * 1000;
const FROM = 'Flavor Isle <smashie@order.flavor-isle.com>';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    // Carts are only saved for authenticated users, and every cart change bumps
    // updated_date, so the most-recently-updated profiles hold every active or
    // recently-abandoned cart. 500 is plenty for a single-location restaurant.
    const profiles = await base44.asServiceRole.entities.CustomerProfile.list('-updated_date', 500);
    const now = Date.now();
    const reminded = [];
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    for (const p of (profiles || [])) {
      const cart = p.cart;
      if (!cart || !Array.isArray(cart.cartItems) || cart.cartItems.length === 0) continue;

      const savedAt = Number(cart.savedAt) || 0;
      if (!savedAt) continue;
      if (now - savedAt < ONE_HOUR_MS) continue; // not idle long enough yet

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
          subject: `🔥 Your cart's getting cold, ${p.name?.split(/\s+/)[0] || 'friend'} — the grill's still hot!`,
          html,
        });
        if (error) throw new Error(error.message || 'send failed');
      } catch (emailErr) {
        // Don't stamp the reminder if the email didn't go out — try again next run.
        reminded.push({ email: p.email, status: 'email_failed', error: emailErr.message });
        continue;
      }

      await base44.asServiceRole.entities.CustomerProfile.update(p.id, {
        cart_reminder_sent_at: new Date().toISOString(),
      });
      reminded.push({ email: p.email, status: 'sent' });
    }

    return Response.json({
      checked: (profiles || []).length,
      reminded_count: reminded.filter((r) => r.status === 'sent').length,
      details: reminded,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}