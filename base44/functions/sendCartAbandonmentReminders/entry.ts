import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Scans CustomerProfiles for saved carts that have sat untouched for more than
// one hour and sends each customer one polite reminder email. Invoked by the
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
const SITE_URL = 'https://flavor-isle.com';

const escapeHtml = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function buildReminderEmail(name, items, subtotal) {
  const firstName = (String(name || '').trim().split(/\s+/)[0]) || 'there';
  const rows = items.slice(0, 4).map((i) => {
    const qty = Number(i.quantity) || 1;
    const lineTotal = (Number(i.price) || 0) * qty;
    return `<tr>
      <td style="padding:7px 0;font-size:15px;color:#003366;">${escapeHtml(i.name)}${qty > 1 ? ` &times;${qty}` : ''}</td>
      <td style="padding:7px 0;font-size:15px;color:#003366;text-align:right;white-space:nowrap;">$${lineTotal.toFixed(2)}</td>
    </tr>`;
  }).join('');
  const moreRow = items.length > 4
    ? `<tr><td colspan="2" style="padding:4px 0;font-size:13px;color:#6b7280;">+${items.length - 4} more item${items.length - 4 !== 1 ? 's' : ''} in your cart</td></tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FDF6E3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FDF6E3;">
    <tr><td align="center" style="padding:28px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 6px 30px rgba(0,0,0,0.06);">
        <tr><td style="background:#003366;padding:22px 28px;text-align:center;">
          <img src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/0e35f400b_wordlogo.png" alt="Flavor Isle" style="max-width:200px;width:100%;height:auto;" />
        </td></tr>
        <tr><td style="padding:28px 30px 8px 30px;">
          <p style="margin:0 0 14px 0;font-size:17px;color:#003366;line-height:1.6;">Hi ${escapeHtml(firstName)},</p>
          <p style="margin:0 0 18px 0;font-size:16px;color:#3a4a5a;line-height:1.6;">You left a few things in your cart at Flavor Isle — and they're still saved for you. It only takes a minute to finish your order whenever you're ready.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 22px 0;">
            ${rows}${moreRow}
            <tr><td colspan="2" style="border-top:1px solid #e5d9b6;padding-top:10px;font-weight:700;color:#CC3300;font-size:15px;">Estimated subtotal</td>
            <td style="border-top:1px solid #e5d9b6;padding-top:10px;font-weight:700;color:#CC3300;font-size:15px;text-align:right;white-space:nowrap;">$${subtotal.toFixed(2)}</td></tr>
          </table>
          <p style="text-align:center;margin:0 0 22px 0;">
            <a href="${SITE_URL}/menu" style="display:inline-block;background:#CC3300;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.04em;padding:14px 34px;border-radius:999px;">Finish my order</a>
          </p>
          <p style="font-size:12px;color:#8a9aa8;line-height:1.5;margin:0;">Prices, availability, and tax are confirmed at checkout. You're receiving this because items are saved to your Flavor Isle account.</p>
        </td></tr>
        <tr><td style="padding:14px 30px 24px 30px;">
          <p style="font-size:11px;color:#a0acb8;text-align:center;margin:0;">Flavor Isle &middot; 103 N Main St, Smiths Grove, KY &middot; <a href="${SITE_URL}" style="color:#a0acb8;">flavor-isle.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    // Carts are only saved for authenticated users, and every cart change bumps
    // updated_date, so the most-recently-updated profiles hold every active or
    // recently-abandoned cart. 500 is plenty for a single-location restaurant.
    const profiles = await base44.asServiceRole.entities.CustomerProfile.list('-updated_date', 500);
    const now = Date.now();
    const reminded = [];

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
        await base44.integrations.Core.SendEmail({
          to: p.email,
          from_name: 'Flavor Isle',
          subject: 'Your Flavor Isle cart is waiting \uD83C\uDF54',
          body: buildReminderEmail(p.name, items, subtotal),
        });
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