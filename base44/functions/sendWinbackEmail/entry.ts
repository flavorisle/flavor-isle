import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { Resend } from 'npm:resend@3.2.0';
import { brandedEmailHtml, trackedLink } from '../../shared/sendOrderEmails.ts';
import { excludeMaltSundae, fanFavoriteSort, dailyRotate } from '../../shared/dessertPriority.ts';
import { loadBlockFilter } from '../../shared/blockedContacts.ts';
import { canSendMarketingEmail } from '../../shared/messagePolicy.ts';
import { normalizeEmail, isEmailableCustomer } from '../../shared/emailSafety.ts';
import { armWinbackCodeForSegment, winbackSegmentFor } from '../../shared/promoCode.ts';
import { loadWinbackCustomers } from '../../shared/winbackAudience.ts';

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

const INTERNAL_EMAILS = new Set([
  'wesley@flavor-isle.com',
  'wesleyrbooker1@gmail.com',
  'test@example.com',
]);

function isSkipEmail(email) {
  const e = normalizeEmail(email);
  if (!e || INTERNAL_EMAILS.has(e)) return true;
  return !isEmailableCustomer(e);
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const { test_mode, test_recipient_email, customer_email } = await req.json();
    const isTest = !!test_mode;
    if (isTest && !test_recipient_email) {
      return Response.json({ error: 'test_recipient_email is required when test_mode is true' }, { status: 400 });
    }
    // A test send goes to an operator-chosen address, so it is admin-only. The
    // scheduled loyalty run never passes test_mode.
    if (isTest) {
      const { error: authError } = await requireAdmin(base44);
      if (authError) return authError;
    }

    const now = Date.now();
    // Issue #325: every lapsed customer is a win-back audience, split by how long
    // they have been away — 30-59 days (d30), 60-179 (d60), 180+ (d180).
    const lowerBound = new Date(now - 30 * 24 * 60 * 60 * 1000);  // 30 days ago

    // Full purchase history, joined to the same customer directory as Admin.
    const customerLastOrder = await loadWinbackCustomers(base44);

    let targets = [];

    if (isTest) {
      // Test mode: pick a real customer for the email content
      if (customer_email) {
        const customer = customerLastOrder.get(normalizeEmail(customer_email));
        targets = [{
          email: customer_email,
          order: customer?.order || { customer_name: 'friend', id: null },
          created: customer?.created || new Date(),
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
      // Production: customers whose last completed order was 30 or more days ago
      for (const [email, { order, created }] of customerLastOrder) {
        if (created <= lowerBound) {
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

    // Issue #93 (A11): blocked customers never receive a win-back email. The
    // block list is read once per run; a failed read is logged and the run
    // continues.
    const blockFilter = await loadBlockFilter(base44).catch((e) => {
      console.error('Block-list lookup failed, sending unfiltered:', e.message);
      return null;
    });

    // Issue #325: each segment's code and percentage come from its own PromoCode
    // record, so an email can only ever quote the values checkout enforces. A
    // code is armed only after an email for that segment is actually accepted by
    // the sender in this run, from that send moment: a run that emails nobody
    // leaves every expires_at untouched, and a test send arms nothing.
    const codeRows = await base44.asServiceRole.entities.PromoCode.list('-created_date', 20).catch(() => []);
    const codeBySegment = new Map<string, any>();
    for (const row of (Array.isArray(codeRows) ? codeRows : [])) {
      if (row?.segment && !codeBySegment.has(row.segment)) codeBySegment.set(row.segment, row);
    }
    const armedSegments = new Set<string>();

    // Process each target
    let processed = 0;
    let skipped = 0;
    for (const target of targets) {
      // Issue #93 (A11): a blocked customer is skipped, and no LoyaltyEmail
      // claim is written, so lifting the block later makes them eligible again.
      if (!isTest && blockFilter && (blockFilter.hasEmail(target.email) || blockFilter.hasPhone(target.order?.customer_phone))) {
        console.log(`Win-back email skipped for ${target.email}: contact is on the block list.`);
        skipped++;
        continue;
      }

      // Message consolidation cap: no marketing email within 24 hours of an
      // order, and only one automated marketing email per 7 days.
      const policy = await canSendMarketingEmail(base44, target.email);
      if (!policy.ok) { console.log(`Marketing skip for ${target.email}: ${policy.reason}`); skipped++; continue; }

      // The recipient's own segment decides which code the email carries.
      const segment = winbackSegmentFor(target.created);
      const code = codeBySegment.get(segment);
      if (!code?.code) {
        console.error(`Win-back email skipped for ${target.email}: no code found for segment ${segment}.`);
        skipped++;
        continue;
      }
      const codePercent = Math.round(Number(code.percent_off) || 0);

      // Build email
      const firstName = (target.order.customer_name || 'friend').split(' ')[0] || 'friend';
      const subject = `We miss you, ${firstName} 🍦`;
      const ctaLink = trackedLink('/menu', 'winback_cta');
      const bodyHtml = `
        <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey ${firstName},</p>
        <p style="color:#141414;font-size:16px;margin:0 0 24px;line-height:1.6;">It's been a minute. The grill's still hot, the desserts are still decadent, and the family's still here. Place your next order on flavor-isle.com after 30 days away and <strong>100 Stars</strong> will land in your Star Rewards account. We would love to see you again.</p>
        <p style="color:#141414;font-size:16px;margin:0 0 24px;line-height:1.6;">Online only: use code <strong>${code.code}</strong> for ${codePercent}% off your next order of $10 or more. One use per customer, valid 21 days from today.</p>
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

        // The window starts at the send that actually carried the code: arm this
        // segment's code once, right after its first accepted email in this run.
        if (!armedSegments.has(segment)) {
          const armed = await armWinbackCodeForSegment(base44, segment);
          if (armed) {
            armedSegments.add(segment);
            console.log(`Win-back code ${armed.code} armed until ${armed.expires_at}.`);
          } else {
            console.error(`Win-back code ${segment} could not be armed after a successful send.`);
          }
        }
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