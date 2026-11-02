import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { Resend } from 'npm:resend@3.2.0';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { brandedEmailHtml } from '../../shared/sendOrderEmails.ts';
import { loadBlockFilter } from '../../shared/blockedContacts.ts';

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
    let htmlBody = (body?.body || '').trim();
    let bodySource = htmlBody ? 'body' : 'none';
    if (!htmlBody && typeof body?.body_url === 'string' && /^https:\/\//.test(body.body_url.trim())) {
      try {
        const r = await fetch(body.body_url.trim(), { headers: { 'User-Agent': 'FlavorIsleAgent/1.0' } });
        if (!r.ok) return Response.json({ error: `body_url fetch failed (${r.status})` }, { status: 502 });
        htmlBody = (await r.text()).trim();
        bodySource = 'body_url';
      } catch (e) {
        return Response.json({ error: `body_url fetch failed: ${e.message}` }, { status: 502 });
      }
    }
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

    // Cursor pagination. The offset form silently returned 746 of 1,003
    // active rows (incident 2026-11-02) and the pre-fix version re-read the
    // same rows on every page, which caused duplicate sends.
    const active = [];
    const queuedIds = new Set();
    let cursor = null;
    for (let guard = 0; guard < 100; guard++) {
      const pageRes = cursor
        ? await base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'active' }, { limit: 500, cursor })
        : await base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'active' }, { limit: 500 });
      const items = Array.isArray(pageRes) ? pageRes : (pageRes?.items || []);
      for (const sub of items) {
        if (queuedIds.has(sub.id)) continue;
        queuedIds.add(sub.id);
        active.push(sub);
      }
      if (Array.isArray(pageRes)) break;
      if (!pageRes?.has_more || !pageRes?.next_cursor) break;
      cursor = pageRes.next_cursor;
    }

    // Issue #93 (A2): blocked customers never receive a broadcast. The block
    // list is read ONCE per run, and a failed read aborts the whole send — a
    // newsletter is never delivered unfiltered (fail-closed, retryable).
    let blockFilter;
    try {
      blockFilter = await loadBlockFilter(base44);
    } catch (e) {
      console.error('Newsletter broadcast aborted — block-list lookup failed:', e.message);
      return Response.json({ ok: false, error: 'Block-list lookup failed; the broadcast was aborted before sending anything. Please retry.' }, { status: 503 });
    }

    // Load EVERY prior send for this broadcast (paginated) so a resumed or
    // retried run skips subscribers who already received it. A single-page
    // read silently lost everyone past the first 500 (incident 2026-11-02).
    const excludeBids = Array.isArray(body?.exclude_broadcast_ids)
      ? body.exclude_broadcast_ids.filter((b) => typeof b === 'string' && b.trim())
      : [];
    const alreadySent = new Set();
    for (const loadBid of [bid, ...excludeBids]) {
      for (let p = 1; p <= 60; p++) {
        const priorPage = await base44.asServiceRole.entities.NewsletterSend.filter({ broadcast_id: loadBid }, '-created_date', 500, (p - 1) * 500);
        if (!priorPage || priorPage.length === 0) break;
        for (const s of priorPage) alreadySent.add(s.subscriber_id);
        if (priorPage.length < 500) break;
      }
    }

    if (body?.count_only === true) {
      let eligible = 0, withheld = 0;
      for (const sub of active) {
        if (alreadySent.has(sub.id)) { withheld++; continue; }
        if (blockFilter.hasEmail(sub.email)) { withheld++; continue; }
        eligible++;
      }
      return Response.json({ ok: true, count_only: true, eligible, withheld, total: active.length, broadcast_id: bid, body_source: bodySource });
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    let sent = 0, skipped = 0, failed = 0, blocked = 0;
    for (const sub of active) {
      if (alreadySent.has(sub.id)) { skipped++; continue; }
      // Issue #93 (A2): a blocked customer is skipped, never emailed.
      if (blockFilter.hasEmail(sub.email)) { blocked++; skipped++; continue; }
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
      alreadySent.add(sub.id);
    }
    console.log(`Newsletter broadcast ${bid}: ${sent} sent, ${skipped} skipped (${blocked} blocked), ${failed} failed of ${active.length} active`);
    return Response.json({ ok: true, sent, skipped, blocked, failed, total: active.length, broadcast_id: bid, body_source: bodySource });
  } catch (error) {
    console.error('sendNewsletterBroadcast error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}