import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { Resend } from 'npm:resend@3.2.0';
import { brandedEmailHtml } from '../../shared/sendOrderEmails.ts';
import { GOOGLE_REVIEW_URL } from '../../shared/googleReviewUrl.ts';

// Backend function endpoints are NOT reachable through the custom domain.
const FUNCTION_BASE = 'https://taste-isle-express.base44.app';
const FROM = 'Flavor Isle <smashie@order.flavor-isle.com>';

// Internal/test emails that should never receive a review-request email.
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
    const { order_id, test_mode, test_recipient_email, test_email } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id is required' }, { status: 400 });

    // Test mode: send to a specified address instead of the order's customer,
    // bypass the skip-list / frequency-cap / already-sent checks, and do NOT
    // create a ReviewRequestEmail tracking record. Supports both the new
    // (test_mode + test_recipient_email) and legacy (test_email) param styles.
    const isTest = !!(test_mode || test_email);
    const testEmail = test_recipient_email || test_email;
    if (isTest && !testEmail) {
      return Response.json({ error: 'test_recipient_email is required when test_mode is true' }, { status: 400 });
    }

    // ── Load the order ──
    const order = await base44.asServiceRole.entities.Order.get(order_id);
    if (!order) return Response.json({ skipped: true, reason: 'order not found' });

    // ── Guardrails ──
    if (order.status === 'cancelled' || order.payment_status === 'failed' || order.payment_status === 'refunded') {
      return Response.json({ skipped: true, reason: 'order cancelled or payment failed/refunded' });
    }
    if (!isTest && isSkipEmail(order.customer_email)) {
      return Response.json({ skipped: true, reason: 'skip email (POS/test/internal)' });
    }

    // Already sent for THIS order, or customer received one in the last 30 days
    // (skip dedup in test mode).
    if (!isTest) {
      const existing = await base44.asServiceRole.entities.ReviewRequestEmail.filter({ order_id: order.id });
      if (existing && existing.length > 0) {
        return Response.json({ skipped: true, reason: 'already sent for this order' });
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recent = await base44.asServiceRole.entities.ReviewRequestEmail.filter({
        customer_email: order.customer_email,
      });
      if (recent && recent.some((r) => r.sent_at && new Date(r.sent_at) > thirtyDaysAgo)) {
        return Response.json({ skipped: true, reason: 'customer received one in last 30 days' });
      }

      // Atomic claim: try to set review_email_sent_at on the order. If another
      // concurrent call already set it, updated === 0 and we skip — preventing
      // duplicate emails when two triggers race past the log-based check above.
      const claim = await base44.asServiceRole.entities.Order.updateMany(
        { id: order.id, review_email_sent_at: null },
        { $set: { review_email_sent_at: new Date().toISOString() } }
      );
      if (!claim || claim.updated === 0) {
        return Response.json({ skipped: true, reason: 'already sent for this order (atomic claim)' });
      }
    }

    // ── Build email HTML ──
    const firstName = (order.customer_name || 'friend').split(' ')[0] || 'friend';
    // Route the CTA through trackReviewClick so the click is counted in
    // EmailClick before redirecting to the Google review page.
    const reviewLink = `${FUNCTION_BASE}/functions/trackReviewClick?order_id=${encodeURIComponent(order.id)}`;
    const subject = "How'd we do? 🍔";

    const bodyHtml = `
      <p style="color:#666;margin:0 0 10px;font-size:16px;">Thanks for eating with us, ${firstName}!</p>
      <p style="color:#141414;font-size:16px;margin:0 0 24px;line-height:1.6;">Flavor Isle has been family-run since 1964, and word of mouth is how a small-town diner survives. If we made your day, would you leave us a quick Google review? Takes about 30 seconds — and honestly, it means the world to us.</p>
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${reviewLink}" style="display:inline-block;background:#C0392B;color:#fff;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:18px 44px;border-radius:999px;font-size:18px;">Leave a Google review →</a>
      </div>
      <p style="color:#999;font-size:13px;margin:18px 0 0;line-height:1.5;">P.S. If something wasn't right with your order, don't post it — just reply to this email and we'll make it right.</p>
      <p style="color:#999;font-size:12px;margin:18px 0 0;line-height:1.5;">You're getting this because you ordered from Flavor Isle. Don't want these emails? <a href="mailto:smashie@flavor-isle.com?subject=Unsubscribe" style="color:#999;text-decoration:underline;">Unsubscribe</a>.</p>
    `;

    const html = brandedEmailHtml(bodyHtml);

    // ── Send via Resend ──
    const recipient = isTest ? testEmail : order.customer_email;
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const { error } = await resend.emails.send({
      from: FROM,
      to: recipient,
      subject: isTest ? `[TEST] ${subject}` : subject,
      html,
    });
    if (error) {
      console.error('Review request email send error:', error);
      // Release the claim so it can be retried on the next workflow run
      if (!isTest) {
        try {
          await base44.asServiceRole.entities.Order.updateMany(
            { id: order.id },
            { $unset: { review_email_sent_at: "" } }
          );
        } catch (e) {
          console.warn('Failed to release review_email claim:', e.message);
        }
      }
      return Response.json({ ok: false, error: 'email send failed' }, { status: 500 });
    }

    // ── Track it (skip record creation in test mode) ──
    if (!isTest) {
      await base44.asServiceRole.entities.ReviewRequestEmail.create({
        order_id: order.id,
        customer_email: order.customer_email,
        sent_at: new Date().toISOString(),
      });
    }

    console.log(`Review request email sent to ${recipient}${isTest ? ' [TEST]' : ''} for order ${order.order_number || order.id}`);
    return Response.json({ ok: true, test: isTest, recipient });
  } catch (error) {
    console.error('sendReviewRequestEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}