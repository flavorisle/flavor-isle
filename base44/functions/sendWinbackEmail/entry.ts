import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { Resend } from 'npm:resend@3.2.0';
import { brandedEmailHtml, trackedLink } from '../../shared/sendOrderEmails.ts';
import { grantLoyaltyPointsByEmail } from '../../shared/squareLoyalty.ts';

const FROM = 'Flavor Isle <smashie@order.flavor-isle.com>';
const WINBACK_POINTS = 150;

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
      // Look up phone from CustomerProfile for loyalty grant
      let phone = null;
      try {
        const profiles = await base44.asServiceRole.entities.CustomerProfile.filter({ email: target.email });
        phone = profiles?.[0]?.phone || null;
      } catch (e) { /* ignore */ }

      // Grant loyalty points (skip in test mode)
      let pointsGranted = 0;
      if (!isTest) {
        try {
          const result = await grantLoyaltyPointsByEmail({
            email: target.email,
            phone,
            points: WINBACK_POINTS,
            reason: 'Win-back email bonus — free small cone or cup',
            idempotencyKey: `winback:${target.email}:${target.order.id || Date.now()}`,
          });
          if (result) pointsGranted = WINBACK_POINTS;
        } catch (e) {
          console.error(`Win-back points grant failed for ${target.email}:`, e.message);
        }
      }

      // Build email
      const firstName = (target.order.customer_name || 'friend').split(' ')[0] || 'friend';
      const subject = `We miss you, ${firstName} 🍦`;
      const ctaLink = trackedLink('/menu', 'winback_cta');
      const bodyHtml = `
        <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey ${firstName},</p>
        <p style="color:#141414;font-size:16px;margin:0 0 24px;line-height:1.6;">It's been a minute. The grill's still hot, the shakes are still thick, and the family's still here. We just dropped <strong>150 points</strong> in your Flavor Isle account — that's a free small cone or cup of ice cream, waiting on you. No strings attached. Just come see us.</p>
        <div style="text-align:center;margin:28px 0 8px;">
          <a href="${ctaLink}" style="display:inline-block;background:#C0392B;color:#fff;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:18px 44px;border-radius:999px;font-size:18px;">Claim your cone →</a>
        </div>
        <p style="color:#999;font-size:12px;margin:18px 0 0;line-height:1.5;">You're getting this because you've ordered from Flavor Isle before. Don't want these emails? <a href="mailto:smashie@order.flavor-isle.com?subject=Unsubscribe" style="color:#999;text-decoration:underline;">Unsubscribe</a>.</p>
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
          points_granted: pointsGranted,
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