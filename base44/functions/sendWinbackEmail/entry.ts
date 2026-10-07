import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { Resend } from 'npm:resend@3.2.0';
import { brandedEmailHtml, trackedLink } from '../../shared/sendOrderEmails.ts';
import { excludeMaltSundae, fanFavoriteSort, dailyRotate } from '../../shared/dessertPriority.ts';

const FROM = 'Flavor Isle <smashie@flavor-isle.com>';

// Win-back themed photo block — a big "We miss you" hero overlay on a
// premium dessert photo, then a 2-column grid of what they've been missing.
// Uses only real Flavor Isle menu photography. Falls back gracefully.
async function winbackPhotosHtml(base44) {
  try {
    const items = await base44.asServiceRole.entities.MenuItem.list('-updated_date', 200);
    const withPhotos = (items || []).filter(m =>
      m.is_available !== false && m.is_hidden !== true && m.image_url
    );

    // Premium desserts — the indulgent treats we want to tempt lapsed
    // customers back with. Excludes basic malts and sundaes (the everyday
    // items every customer already knows about).
    const PREMIUM_DESSERT = /banana split|hot fudge cake|caramel apple bliss|banana pudding bliss|strawberry shortcake|pineapple delight|banana split bliss/;
    const premiumDesserts = excludeMaltSundae(withPhotos.filter(m => {
      const name = (m.name || '').toLowerCase();
      return PREMIUM_DESSERT.test(name);
    }));

    // Fallback: if no premium desserts have photos, use fan favorites
    // (malts/sundaes excluded). Sort by fan-favorite rank, rotate by Chicago
    // day. No malt/sundae fallback at any level.
    const heroPool = premiumDesserts.length > 0
      ? premiumDesserts
      : excludeMaltSundae(withPhotos.filter(m => m.is_fan_favorite));
    heroPool.sort(fanFavoriteSort);
    const hero = dailyRotate(heroPool)[0] || null;

    // Grid: 2 more premium desserts (not the hero), falling back to fan
    // favorites (malts/sundaes excluded) when fewer than 2 premium desserts.
    const gridPool = premiumDesserts.filter(m => m.id !== hero?.id);
    const pool = gridPool.length >= 2
      ? gridPool
      : excludeMaltSundae(withPhotos.filter(m => m.is_fan_favorite && m.id !== hero?.id));
    pool.sort(fanFavoriteSort);
    const gridPicks = dailyRotate(pool).slice(0, 2);

    let heroHtml = '';
    if (hero) {
      const heroLink = trackedLink('/menu', 'winback_hero');
      heroHtml = `
      <a href="${heroLink}" style="text-decoration:none;color:#141414;display:block;margin:0 0 20px;">
        <div style="position:relative;border-radius:16px;overflow:hidden;">
          <img src="${hero.image_url_opt || hero.image_url}" alt="${(hero.name || 'Flavor Isle favorite').replace(/"/g, '&quot;')}" width="500" style="width:100%;max-width:500px;border-radius:16px;display:block;object-fit:cover;aspect-ratio:5/3;background:#f5edd6;" />
          <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.55) 100%);border-radius:16px;"></div>
          <div style="position:absolute;bottom:16px;left:20px;right:20px;">
            <p style="color:#F5A623;font-family:'Oswald',Arial,sans-serif;font-size:13px;margin:0 0 4px;letter-spacing:3px;">🍦 A SWEET TREAT IS WAITING</p>
            <p style="color:#fff;font-family:'Oswald',Arial,sans-serif;font-size:24px;margin:0;letter-spacing:1px;">${hero.name || 'Your favorite is waiting'}</p>
          </div>
        </div>
      </a>`;
    }

    let gridHtml = '';
    if (gridPicks.length > 0) {
      const cells = gridPicks.map(p => {
        const link = trackedLink('/menu', 'winback_grid');
        const price = typeof p.price === 'number' ? `$${p.price.toFixed(2)}` : '';
        return `<td style="width:50%;vertical-align:top;padding:0 5px;">
          <a href="${link}" style="text-decoration:none;color:#141414;display:block;">
            <img src="${p.image_url_opt || p.image_url}" alt="${(p.name || '').replace(/"/g, '&quot;')}" width="100%" style="width:100%;border-radius:12px;display:block;object-fit:cover;aspect-ratio:1/1;background:#f5edd6;" />
            <div style="font-family:'Oswald',Arial,sans-serif;font-size:15px;line-height:1.3;margin-top:8px;color:#141414;">${p.name || 'Flavor Isle Favorite'}</div>
            ${price ? `<div style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:13px;font-weight:bold;margin-top:2px;">${price}</div>` : ''}
          </a>
        </td>`;
      }).join('');
      gridHtml = `
      <div style="margin:20px 0 8px;">
        <p style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:15px;margin:0 0 10px;letter-spacing:2px;text-align:center;">🍨 INDULGE IN SOMETHING SWEET</p>
        <table style="width:100%;border-collapse:separate;border-spacing:5px 0;"><tr>${cells}</tr></table>
      </div>`;
    }

    return `${heroHtml}${gridHtml}`;
  } catch (err) {
    console.error('winbackPhotosHtml failed:', err.message);
    return '';
  }
}

const SKIP_EMAILS = new Set([
  'square-pos@flavorisle.com',
  'wesley@flavor-isle.com',
  'wesleyrbooker1@gmail.com',
  'test@example.com',
]);

function isSkipEmail(email) {
  if (!email) return true;
  const e = email.toLowerCase().trim();
  if (SKIP_EMAILS.has(e)) return true;
  if (e.endsWith('@flavorisle.com')) return true;
  return false;
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const { test_mode, test_recipient_email, customer_email } = await req.json();
    const isTest = !!test_mode;
    if (isTest && !test_recipient_email) {
      return Response.json({ error: 'test_recipient_email is required when test_mode is true' }, { status: 400 });
    }

    const now = Date.now();
    const lowerBound = new Date(now - 30 * 24 * 60 * 60 * 1000);  // 30 days ago
    const upperBound = new Date(now - 35 * 24 * 60 * 60 * 1000);  // 35 days ago

    // Load recent orders (last 60 days covers the 30-35 day window)
    const orders = await base44.asServiceRole.entities.Order.list('-created_date', 500);
    const completedStatuses = ['completed', 'delivered'];

    // Group completed online orders by customer email, tracking most recent
    const customerLastOrder = new Map();
    for (const o of (orders || [])) {
      if (!o.customer_email || o.order_source === 'in_store') continue;
      if (!completedStatuses.includes(o.status)) continue;
      if (o.payment_status === 'failed' || o.payment_status === 'refunded') continue;
      const created = new Date(o.created_date);
      const existing = customerLastOrder.get(o.customer_email);
      if (!existing || created > existing.created) {
        customerLastOrder.set(o.customer_email, { order: o, created });
      }
    }

    let targets = [];

    if (isTest) {
      // Test mode: pick a real customer for the email content
      if (customer_email) {
        const customerOrders = (orders || [])
          .filter(o => o.customer_email === customer_email && completedStatuses.includes(o.status))
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        targets = [{
          email: customer_email,
          order: customerOrders[0] || { customer_name: 'friend', id: null },
          created: customerOrders[0] ? new Date(customerOrders[0].created_date) : new Date(),
        }];
      } else {
        // Pick the first customer with a completed order
        const first = Array.from(customerLastOrder.values())[0];
        if (first) {
          targets = [{ email: first.order.customer_email, order: first.order, created: first.created }];
        } else {
          targets = [{ email: 'test@example.com', order: { customer_name: 'friend', id: null }, created: new Date() }];
        }
      }
    } else {
      // Production: customers whose last completed order was 30-35 days ago
      for (const [email, { order, created }] of customerLastOrder) {
        if (created <= lowerBound && created >= upperBound) {
          if (!isSkipEmail(email)) {
            targets.push({ email, order, created });
          }
        }
      }

      // Dedup: no win-back in last 90 days
      const existing = await base44.asServiceRole.entities.LoyaltyEmail.filter({ email_type: 'winback' });
      const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000);
      const recentByEmail = new Set();
      for (const r of (existing || [])) {
        if (r.sent_at && new Date(r.sent_at) > ninetyDaysAgo) {
          recentByEmail.add(r.customer_email);
        }
      }
      targets = targets.filter(t => !recentByEmail.has(t.email));
    }

    if (targets.length === 0) {
      return Response.json({ ok: true, skipped: true, reason: 'no qualifying customers' });
    }

    // Process each target
    let processed = 0;
    let skipped = 0;
    for (const target of targets) {
      // Build email
      const firstName = (target.order.customer_name || 'friend').split(' ')[0] || 'friend';
      const subject = `We miss you, ${firstName} 🍦`;
      const ctaLink = trackedLink('/menu', 'winback_cta');
      const bodyHtml = `
        <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey ${firstName},</p>
        <p style="color:#141414;font-size:16px;margin:0 0 24px;line-height:1.6;">It's been a minute. The grill's still hot, the desserts are still decadent, and the family's still here. Place your next order on flavor-isle.com after 30 days away and <strong>100 Stars</strong> will land in your Star Rewards account. We would love to see you again.</p>
        ${await winbackPhotosHtml(base44)}
        <div style="text-align:center;margin:24px 0 8px;">
          <a href="${ctaLink}" style="display:inline-block;background:#C0392B;color:#fff;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:18px 44px;border-radius:999px;font-size:18px;">Order online →</a>
        </div>
        <p style="color:#999;font-size:12px;margin:18px 0 0;line-height:1.5;">You're getting this because you've ordered from Flavor Isle before. Don't want these emails? <a href="mailto:unsubscribe@flavor-isle.com?subject=Unsubscribe" style="color:#999;text-decoration:underline;">Unsubscribe</a>.</p>
      `;
      const html = brandedEmailHtml(bodyHtml);

      const recipient = isTest ? test_recipient_email : target.email;
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      const { error } = await resend.emails.send({
        from: FROM,
        to: recipient,
        subject: isTest ? `[TEST] ${subject}` : subject,
        html,
      });
      if (error) {
        console.error('Win-back email send error:', error);
        skipped++;
        continue;
      }

      if (!isTest) {
        await base44.asServiceRole.entities.LoyaltyEmail.create({
          email_type: 'winback',
          customer_email: target.email,
          order_id: target.order.id || null,
          points_granted: 0,
          sent_at: new Date().toISOString(),
        });
      }

      processed++;
      console.log(`Win-back email sent to ${recipient}${isTest ? ' [TEST]' : ''}`);
    }

    return Response.json({ ok: true, found: targets.length, processed, skipped, test: isTest });
  } catch (error) {
    console.error('sendWinbackEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}