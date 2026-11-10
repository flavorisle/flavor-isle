import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { Resend } from 'npm:resend@3.2.0';
import * as mjmlPackage from 'npm:mjml';
import { secrets } from 'base44:runtime';

// Admin-only broadcast of a designed (MJML) email template to ACTIVE
// EmailSubscribers, sent through the app's own Resend pipeline so it is not
// bound by the platform's hourly cap on non-registered recipients.
//
//   action: 'count'  — eligibility only, nothing sent.
//   action: 'send'   — paced batch; call again until remaining is 0.
//
// Idempotency is per recipient through NewsletterSend rows (broadcast_id +
// subscriber_id), so a retry or a finished run never emails anyone twice.
const FROM = 'Flavor Isle <smashie@flavor-isle.com>';
const APP_BASE = 'https://flavor-isle.com';
const MAX_PER_SECOND = 5;
const MIN_GAP_MS = Math.ceil(1000 / MAX_PER_SECOND);
const SOFT_BUDGET_MS = 55000;
const BATCH_SIZE = 300;

function templateSubject(mjmlSource) {
  const m = mjmlSource.match(/<mj-title>([\s\S]*?)<\/mj-title>/i);
  return (m ? m[1] : 'Flavor Isle update').trim();
}

// npm: interop for mjml varies, so resolve whatever shape the package took.
function mjmlCompiler() {
  if (typeof mjmlPackage === 'function') return mjmlPackage;
  const fallback = mjmlPackage?.default ?? mjmlPackage?.mjml2html;
  if (typeof fallback === 'function') return fallback;
  if (typeof fallback?.default === 'function') return fallback.default;
  throw new Error('MJML compiler unavailable');
}

async function compileDetailed(mjmlSource) {
  const out = await mjmlCompiler()(mjmlSource, { validationLevel: 'soft' });
  const html = typeof out === 'string' ? out : (out?.html || '');
  if (!html) {
    const kind = typeof out;
    const keys = out && kind === 'object' ? Object.keys(out).join(',') : '';
    throw new Error(`MJML compile produced no HTML (result=${kind} keys=${keys})`);
  }
  const errors = Array.isArray(out?.errors) ? out.errors.map((e) => e?.message || String(e)) : [];
  return { html, errors };
}

async function compile(mjmlSource) {
  const res = await compileDetailed(mjmlSource);
  return res.html;
}

// The template carries {{unsubscribe_url}}; it can only be filled per
// recipient, so each subscriber gets their own one-click link.
function withUnsubscribe(html, token) {
  const link = token
    ? `${APP_BASE}/unsubscribe?token=${encodeURIComponent(token)}`
    : `${APP_BASE}/unsubscribe`;
  return html.split('{{unsubscribe_url}}').join(link);
}

// A permanent failure means the address itself will never accept mail.
function isPermanentFailure(error) {
  const code = Number(error?.statusCode || error?.status || 0);
  if (code === 429) return false;
  if (code >= 500) return false;
  if (code >= 400 && code < 500) return true;
  const name = String(error?.name || '').toLowerCase();
  return name.includes('validation') || name.includes('invalid');
}

async function loadActive(base44) {
  const active = [];
  const seen = new Set();
  let cursor = null;
  for (let g = 0; g < 100; g++) {
    const page = cursor
      ? await base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'active' }, { limit: 500, cursor })
      : await base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'active' }, { limit: 500 });
    const items = Array.isArray(page) ? page : (page?.items || []);
    for (const s of items) {
      if (!seen.has(s.id)) { seen.add(s.id); active.push(s); }
    }
    if (Array.isArray(page) || !page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
  }
  active.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return active;
}

async function loadPriorRows(base44, bid) {
  const bySub = new Map();
  let cursor = null;
  for (let g = 0; g < 60; g++) {
    const page = cursor
      ? await base44.asServiceRole.entities.NewsletterSend.filter({ broadcast_id: bid }, { limit: 500, cursor })
      : await base44.asServiceRole.entities.NewsletterSend.filter({ broadcast_id: bid }, { limit: 500 });
    const items = Array.isArray(page) ? page : (page?.items || []);
    for (const r of items) if (r.subscriber_id) bySub.set(r.subscriber_id, r);
    if (Array.isArray(page) || !page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
  }
  return bySub;
}

async function loadBlockedEmails(base44) {
  const blocked = new Set();
  let cursor = null;
  for (let g = 0; g < 20; g++) {
    const page = cursor
      ? await base44.asServiceRole.entities.BlockedContact.filter({ is_active: true }, { limit: 500, cursor })
      : await base44.asServiceRole.entities.BlockedContact.filter({ is_active: true }, { limit: 500 });
    const items = Array.isArray(page) ? page : (page?.items || []);
    for (const b of items) if (b.email) blocked.add(String(b.email).toLowerCase().trim());
    if (Array.isArray(page) || !page?.has_more || !page?.next_cursor) break;
    cursor = page.next_cursor;
  }
  return blocked;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const payload = await req.json().catch(() => ({}));
    const requested = String(payload?.action || '');
    const action = requested === 'send' || requested === 'render' ? requested : 'count';
    const bid = String(payload?.broadcast_id || '').trim();
    const mjmlSource = String(payload?.mjml_source || '');
    if (!bid) return Response.json({ error: 'broadcast_id is required' }, { status: 400 });
    if (!mjmlSource) return Response.json({ error: 'mjml_source is required' }, { status: 400 });

    const subject = templateSubject(mjmlSource);

    const [active, priorBySub, blocked] = await Promise.all([
      loadActive(base44),
      loadPriorRows(base44, bid),
      loadBlockedEmails(base44),
    ]);

    const alreadySent = new Set();
    for (const [subId, row] of priorBySub.entries()) {
      if (row.status === 'sent' || row.status === 'skipped') alreadySent.add(subId);
    }

    const queue = active.filter((s) => {
      if (!s.email) return false;
      if (alreadySent.has(s.id)) return false;
      return !blocked.has(String(s.email).toLowerCase().trim());
    });

    const base = {
      ok: true,
      subject,
      broadcast_id: bid,
      total_active: active.length,
      already_sent: alreadySent.size,
      blocked_or_missing: active.length - alreadySent.size - queue.length,
    };

    if (action === 'render') {
      const out = await compileDetailed(mjmlSource);
      return Response.json({
        ...base,
        render_only: true,
        html_length: out.html.length,
        warnings: out.errors.length,
        first_warning: out.errors[0] || null,
        has_unsubscribe_token: out.html.includes('{{unsubscribe_url}}'),
      });
    }

    if (action === 'count') {
      return Response.json({ ...base, count_only: true, eligible: queue.length });
    }

    const htmlTemplate = await compile(mjmlSource);
    const resend = new Resend(secrets.get('RESEND_API_KEY'));

    const startedAt = Date.now();
    let sent = 0;
    let failed = 0;
    let bounced = 0;
    let lastSendAt = 0;
    const sentRows = [];
    const failedRows = [];
    const updates = [];
    const now0 = new Date().toISOString();

    for (const sub of queue.slice(0, BATCH_SIZE)) {
      if (Date.now() - startedAt > SOFT_BUDGET_MS) break;
      const wait = MIN_GAP_MS - (Date.now() - lastSendAt);
      if (lastSendAt && wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastSendAt = Date.now();

      let sendError = null;
      try {
        const { error } = await resend.emails.send({
          from: FROM,
          to: sub.email,
          subject,
          html: withUnsubscribe(htmlTemplate, sub.unsubscribe_token),
        });
        sendError = error || null;
      } catch (e) {
        sendError = e;
      }

      const now = new Date().toISOString();
      const prior = priorBySub.get(sub.id);

      if (sendError) {
        failed++;
        const permanent = isPermanentFailure(sendError);
        const detail = sendError?.message || 'send failed';
        if (prior) {
          updates.push({ id: prior.id, status: 'failed', error: detail, sent_at: now });
        } else {
          failedRows.push({ broadcast_id: bid, subscriber_id: sub.id, email: sub.email, status: 'failed', error: detail, sent_at: now, subject });
        }
        if (permanent) {
          bounced++;
          try {
            await base44.asServiceRole.entities.EmailSubscriber.update(sub.id, { status: 'bounced', bounced_at: now });
          } catch (_) { /* a failed bounce flag never stops the batch */ }
        }
      } else {
        sent++;
        if (prior) {
          updates.push({ id: prior.id, status: 'sent', error: '', sent_at: now });
        } else {
          sentRows.push({ broadcast_id: bid, subscriber_id: sub.id, email: sub.email, status: 'sent', sent_at: now, subject });
        }
        priorBySub.set(sub.id, { id: prior?.id ?? 'pending', status: 'sent' });
      }
    }

    const toCreate = [...sentRows, ...failedRows];
    await Promise.all([
      toCreate.length ? base44.asServiceRole.entities.NewsletterSend.bulkCreate(toCreate) : Promise.resolve(),
      updates.length ? base44.asServiceRole.entities.NewsletterSend.bulkUpdate(updates) : Promise.resolve(),
    ]);

    const processed = sent + failed;
    const remaining = Math.max(0, queue.length - processed);
    console.log(`ProductUpdate ${bid}: ${sent} sent, ${failed} failed (${bounced} bounced), ${remaining} remaining`);

    return Response.json({
      ...base,
      sent,
      failed,
      bounced,
      processed,
      remaining,
      done: remaining === 0,
      elapsed_s: Math.round((Date.now() - startedAt) / 1000),
      logged_at: now0,
    });
  } catch (error) {
    console.error('sendProductUpdateBroadcast error:', error?.message || error);
    return Response.json({ error: error?.message || 'broadcast failed' }, { status: 500 });
  }
}