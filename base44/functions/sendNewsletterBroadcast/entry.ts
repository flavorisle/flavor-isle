import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { Resend } from 'npm:resend@3.2.0';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { brandedEmailHtml } from '../../shared/sendOrderEmails.ts';

// Admin-only newsletter broadcast. Three actions:
//   stats — live active/pending/unsubscribed counts for the composer.
//   test  — send a preview to a single address (the admin's own email).
//   send  — broadcast to every ACTIVE subscriber, with per-recipient
//           delivery logging and content-hash idempotency so a subscriber
//           never receives the same newsletter twice.
const FROM = 'Flavor Isle <smashie@flavor-isle.com>';
const APP_BASE = 'https://flavor-isle.com';

// Deterministic hash of subject+body. The same newsletter content always
// maps to the same broadcast_id, so retries or repeated Send clicks skip
// subscribers who already received it.
function broadcastId(subject, body) {
  const s = (subject || '') + '\n' + (body || '');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return 'nl_' + (h >>> 0).toString(36);
}

function unsubscribeFooter(token) {
  const link = token ? `${APP_BASE}/unsubscribe?token=${encodeURIComponent(token)}` : '#';
  return `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #eee;color:#999;font-size:12px;">You're receiving this because you subscribed to Flavor Isle updates. <a href="${link}" style="color:#003366;">Unsubscribe</a> anytime.</p>`;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const body = await req.json();
    const action = body?.action || 'send';

    if (action === 'stats') {
      const [active, pending, unsub] = await Promise.all([
        base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'active' }, '-subscribed_at', 500),
        base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'pending' }, '-created_date', 500),
        base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'unsubscribed' }, '-unsubscribed_at', 500),
      ]);
      return Response.json({ ok: true, active: active.length, pending: pending.length, unsubscribed: unsub.length });
    }

    const subject = (body?.subject || '').trim();
    const htmlBody = (body?.body || '').trim();
    if (!subject || !htmlBody) return Response.json({ error: 'subject and body are required' }, { status: 400 });

    if (action === 'test') {
      const testEmail = (body?.test_email || '').trim();
      if (!testEmail) return Response.json({ error: 'test_email is required' }, { status: 400 });
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      const { error } = await resend.emails.send({
        from: FROM, to: testEmail, subject: `[TEST] ${subject}`,
        html: brandedEmailHtml(htmlBody + unsubscribeFooter(null)),
      });
      if (error) {
        console.error('Newsletter test send error:', error);
        return Response.json({ ok: false, error: 'email send failed' }, { status: 500 });
      }
      return Response.json({ ok: true, test: true, recipient: testEmail });
    }

    // Broadcast to all active subscribers.
    const bid = broadcastId(subject, htmlBody);
    const active = [];
    let page = 1;
    while (page <= 20) {
      const batch = await base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'active' }, '-subscribed_at', 500, page);
      if (!batch || batch.length === 0) break;
      active.push(...batch);
      if (batch.length < 500) break;
      page++;
    }

    // Load any prior sends for this broadcast so we can skip already-sent
    // subscribers in one pass (idempotency) instead of a query per recipient.
    const priorSends = await base44.asServiceRole.entities.NewsletterSend.filter({ broadcast_id: bid }, '-created_date', 500);
    const alreadySent = new Set(priorSends.map((s) => s.subscriber_id));

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    let sent = 0, skipped = 0, failed = 0;
    for (const sub of active) {
      if (alreadySent.has(sub.id)) { skipped++; continue; }
      const html = brandedEmailHtml(htmlBody + unsubscribeFooter(sub.unsubscribe_token));
      const { error } = await resend.emails.send({ from: FROM, to: sub.email, subject, html });
      const now = new Date().toISOString();
      if (error) {
        failed++;
        try { await base44.asServiceRole.entities.NewsletterSend.create({ broadcast_id: bid, subscriber_id: sub.id, email: sub.email, status: 'failed', error: (error.message || 'send failed'), sent_at: now }); } catch {}
      } else {
        sent++;
        try { await base44.asServiceRole.entities.NewsletterSend.create({ broadcast_id: bid, subscriber_id: sub.id, email: sub.email, status: 'sent', sent_at: now }); } catch {}
      }
    }
    console.log(`Newsletter broadcast ${bid}: ${sent} sent, ${skipped} skipped, ${failed} failed of ${active.length} active`);
    return Response.json({ ok: true, sent, skipped, failed, total: active.length, broadcast_id: bid });
  } catch (error) {
    console.error('sendNewsletterBroadcast error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}