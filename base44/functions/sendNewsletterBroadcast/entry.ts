import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { Resend } from 'npm:resend@3.2.0';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { brandedEmailHtml } from '../../shared/sendOrderEmails.ts';
import { loadBlockFilter } from '../../shared/blockedContacts.ts';

// Admin-only newsletter broadcast. Three actions:
//   stats      — live active/pending/unsubscribed/bounced counts for the composer.
//   test       — send a preview to the calling admin's OWN address only.
//   send       — batched, resumable broadcast to ACTIVE subscribers, with
//                per-recipient delivery logging and content-hash idempotency.
//
// Incident 2026-11-02: a retry handed the sender a truncated body and ~745
// subscribers received it. Three guards now exist so that cannot repeat:
//   1. content integrity — the caller sends expected_body_sha256 /
//      expected_body_length, and a mismatch refuses the whole broadcast before
//      a single email goes out. Without them, a body under 400 characters is
//      refused.
//   2. provenance — every NewsletterSend row records the subject, body hash and
//      body length, so a truncated send is auditable per recipient.
//   3. batching — at most BATCH_SIZE recipients per invocation, paced to
//      MAX_PER_SECOND, returning a cursor the composer resumes from. A resumed
//      run never double-sends (broadcast_id + subscriber_id idempotency).
const FROM = 'Flavor Isle <smashie@flavor-isle.com>';
const APP_BASE = 'https://flavor-isle.com';

const BATCH_SIZE = 40; // recipients handled per invocation
const MAX_PER_SECOND = 3; // Resend pacing ceiling
const MIN_GAP_MS = Math.ceil(1000 / MAX_PER_SECOND);
const SOFT_BUDGET_MS = 22000; // stop starting new sends; hand the rest to the next call
const MIN_UNGUARDED_LENGTH = 400; // floor when the caller supplies no expected hash/length

// Deterministic hash of subject+body. The same newsletter content always
// maps to the same broadcast_id, so retries or repeated Send clicks skip
// subscribers who already received it.
function broadcastId(subject, body) {
  const s = (subject || '') + '\n' + (body || '');
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return 'nl_' + (h >>> 0).toString(36);
}

// Canonical content string the integrity guard hashes. The composer hashes the
// same string client-side, so any truncation or substitution is caught here.
function canonicalContent(subject, htmlBody) {
  return `${subject}\n${htmlBody}`;
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function unsubscribeFooter(token) {
  const link = token ? `${APP_BASE}/unsubscribe?token=${encodeURIComponent(token)}` : '#';
  return `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #eee;color:#999;font-size:12px;">You're receiving this because you subscribed to Flavor Isle updates. <a href="${link}" style="color:#003366;">Unsubscribe</a> anytime.</p>`;
}

// A permanent failure means the address itself will never accept mail — the
// subscriber is marked bounced so later broadcasts skip them. Rate limits and
// provider errors stay retryable.
function isPermanentFailure(error) {
  const code = Number(error?.statusCode || error?.status || 0);
  if (code === 429) return false;
  if (code >= 500) return false;
  if (code >= 400 && code < 500) return true;
  const name = String(error?.name || '').toLowerCase();
  return name.includes('validation') || name.includes('invalid');
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { user, error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const payload = await req.json().catch(() => ({}));
    const action = payload?.action || 'send';

    if (action === 'stats') {
      const [active, pending, unsub, bounced] = await Promise.all([
        base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'active' }, '-subscribed_at', 500),
        base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'pending' }, '-created_date', 500),
        base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'unsubscribed' }, '-unsubscribed_at', 500),
        base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'bounced' }, '-created_date', 500),
      ]);
      return Response.json({ ok: true, active: active.length, pending: pending.length, unsubscribed: unsub.length, bounced: bounced.length });
    }

    const subject = (payload?.subject || '').trim();
    let htmlBody = (payload?.body || '').trim();
    let bodySource = htmlBody ? 'body' : 'none';
    if (!htmlBody && typeof payload?.body_url === 'string' && /^https:\/\//.test(payload.body_url.trim())) {
      try {
        const r = await fetch(payload.body_url.trim(), { headers: { 'User-Agent': 'FlavorIsleAgent/1.0' }, signal: AbortSignal.timeout(10000) });
        if (!r.ok) return Response.json({ error: `body_url fetch failed (${r.status})` }, { status: 502 });
        htmlBody = (await r.text()).trim();
        bodySource = 'body_url';
      } catch (e) {
        return Response.json({ error: `body_url fetch failed: ${e.message}` }, { status: 502 });
      }
    }
    if (!subject || !htmlBody) return Response.json({ error: 'subject and body are required' }, { status: 400 });

    const bodyLength = htmlBody.length;
    const bodySha256 = await sha256Hex(canonicalContent(subject, htmlBody));

    if (action === 'test') {
      // Test sends go to the calling admin's own address only — never to an
      // address supplied in the request. Explicit click required.
      const testEmail = (user?.email || '').trim();
      if (!testEmail) return Response.json({ error: 'no admin email on this account' }, { status: 400 });
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      const { error } = await resend.emails.send({
        from: FROM, to: testEmail, subject: `[TEST] ${subject}`,
        html: brandedEmailHtml(htmlBody + unsubscribeFooter(null)),
      });
      if (error) {
        console.error('Newsletter test send error:', error);
        return Response.json({ ok: false, error: 'email send failed' }, { status: 500 });
      }
      return Response.json({ ok: true, test: true, recipient: testEmail, body_length: bodyLength, body_sha256: bodySha256 });
    }

    // ── Content integrity guard (runs before ANY send) ──────────────────────
    const expectedSha = typeof payload?.expected_body_sha256 === 'string' ? payload.expected_body_sha256.trim().toLowerCase() : '';
    const expectedLength = Number.isFinite(Number(payload?.expected_body_length)) && payload?.expected_body_length !== null && payload?.expected_body_length !== undefined
      ? Number(payload.expected_body_length)
      : null;

    if (expectedSha || expectedLength !== null) {
      const shaMismatch = expectedSha && expectedSha !== bodySha256;
      const lengthMismatch = expectedLength !== null && expectedLength !== bodyLength;
      if (shaMismatch || lengthMismatch) {
        console.error(`Newsletter content mismatch — nothing sent. expected_length=${expectedLength} actual_length=${bodyLength} expected_sha256=${expectedSha || '(none)'} actual_sha256=${bodySha256}`);
        return Response.json({
          ok: false,
          error: 'content mismatch — nothing sent',
          expected_body_length: expectedLength,
          actual_body_length: bodyLength,
          expected_body_sha256: expectedSha || null,
          actual_body_sha256: bodySha256,
        }, { status: 400 });
      }
    } else if (bodyLength < MIN_UNGUARDED_LENGTH) {
      console.error(`Newsletter refused — body too short and unsigned: ${bodyLength} characters (minimum ${MIN_UNGUARDED_LENGTH}). Nothing sent.`);
      return Response.json({
        ok: false,
        error: `content too short — nothing sent (${bodyLength} characters, minimum ${MIN_UNGUARDED_LENGTH}). Send expected_body_sha256 and expected_body_length to sign the body.`,
        actual_body_length: bodyLength,
        actual_body_sha256: bodySha256,
      }, { status: 400 });
    }

    const bid = broadcastId(subject, htmlBody);

    // Cursor pagination. The offset form silently returned 746 of 1,003
    // active rows (incident 2026-11-02) and the pre-fix version re-read the
    // same rows on every page, which caused duplicate sends.
    const active = [];
    const queuedIds = new Set();
    let readCursor = null;
    for (let guard = 0; guard < 100; guard++) {
      const pageRes = readCursor
        ? await base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'active' }, { limit: 500, cursor: readCursor })
        : await base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'active' }, { limit: 500 });
      const items = Array.isArray(pageRes) ? pageRes : (pageRes?.items || []);
      for (const sub of items) {
        if (queuedIds.has(sub.id)) continue;
        queuedIds.add(sub.id);
        active.push(sub);
      }
      if (Array.isArray(pageRes)) break;
      if (!pageRes?.has_more || !pageRes?.next_cursor) break;
      readCursor = pageRes.next_cursor;
    }
    // A stable order is what makes the cursor meaningful across invocations.
    active.sort((a, b) => String(a.id).localeCompare(String(b.id)));

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
    const excludeBids = Array.isArray(payload?.exclude_broadcast_ids)
      ? payload.exclude_broadcast_ids.filter((b) => typeof b === 'string' && b.trim())
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

    const countRemaining = (fromIndex) => {
      let remaining = 0;
      for (let i = fromIndex; i < active.length; i++) {
        const sub = active[i];
        if (alreadySent.has(sub.id)) continue;
        if (blockFilter.hasEmail(sub.email)) continue;
        remaining++;
      }
      return remaining;
    };

    if (payload?.count_only === true) {
      const eligible = countRemaining(0);
      return Response.json({
        ok: true, count_only: true, eligible, withheld: active.length - eligible,
        total: active.length, broadcast_id: bid, body_source: bodySource,
        body_length: bodyLength, body_sha256: bodySha256,
      });
    }

    // ── Batched, resumable send ─────────────────────────────────────────────
    const incomingCursor = payload?.cursor && typeof payload.cursor === 'object' ? payload.cursor : null;
    if (incomingCursor?.broadcast_id && incomingCursor.broadcast_id !== bid) {
      return Response.json({ ok: false, error: 'cursor belongs to a different broadcast — nothing sent' }, { status: 400 });
    }
    const startOffset = Number.isFinite(Number(incomingCursor?.offset)) && Number(incomingCursor?.offset) >= 0
      ? Math.min(Number(incomingCursor.offset), active.length)
      : 0;
    const endOffset = Math.min(startOffset + BATCH_SIZE, active.length);

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const startedAt = Date.now();
    let sent = 0, skipped = 0, failed = 0, blocked = 0, bounced = 0;
    let lastSendAt = 0;
    let i = startOffset;

    for (; i < endOffset; i++) {
      const sub = active[i];
      if (alreadySent.has(sub.id)) { skipped++; continue; }
      // Issue #93 (A2): a blocked customer is skipped, never emailed.
      if (blockFilter.hasEmail(sub.email)) { blocked++; skipped++; continue; }
      // Leave the rest for the next invocation rather than risk a timeout
      // killing the run mid-broadcast.
      if (Date.now() - startedAt > SOFT_BUDGET_MS) break;

      // Pace to no more than MAX_PER_SECOND.
      const wait = MIN_GAP_MS - (Date.now() - lastSendAt);
      if (lastSendAt && wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastSendAt = Date.now();

      const html = brandedEmailHtml(htmlBody + unsubscribeFooter(sub.unsubscribe_token));
      let sendError = null;
      try {
        const { error } = await resend.emails.send({ from: FROM, to: sub.email, subject, html });
        sendError = error;
      } catch (e) {
        // One recipient failing never aborts the batch.
        sendError = e;
      }

      const now = new Date().toISOString();
      const provenance = { subject, body_sha256: bodySha256, body_length: bodyLength };

      if (sendError) {
        failed++;
        const permanent = isPermanentFailure(sendError);
        try {
          await base44.asServiceRole.entities.NewsletterSend.create({
            broadcast_id: bid, subscriber_id: sub.id, email: sub.email,
            status: 'failed', error: (sendError?.message || 'send failed'), sent_at: now, ...provenance,
          });
        } catch {}
        if (permanent) {
          bounced++;
          try { await base44.asServiceRole.entities.EmailSubscriber.update(sub.id, { status: 'bounced', bounced_at: now }); } catch {}
        }
      } else {
        sent++;
        try {
          await base44.asServiceRole.entities.NewsletterSend.create({
            broadcast_id: bid, subscriber_id: sub.id, email: sub.email,
            status: 'sent', sent_at: now, ...provenance,
          });
        } catch {}
      }
      alreadySent.add(sub.id);
    }

    const nextOffset = i;
    const remaining = countRemaining(nextOffset);
    const done = remaining === 0;
    console.log(`Newsletter ${bid} batch [${startOffset}-${nextOffset}/${active.length}]: ${sent} sent, ${skipped} skipped (${blocked} blocked), ${failed} failed (${bounced} bounced), ${remaining} remaining`);

    return Response.json({
      ok: true,
      done,
      broadcast_id: bid,
      body_source: bodySource,
      body_length: bodyLength,
      body_sha256: bodySha256,
      sent, skipped, blocked, failed, bounced,
      processed: nextOffset - startOffset,
      total_active: active.length,
      remaining,
      cursor: done ? null : { offset: nextOffset, broadcast_id: bid },
    });
  } catch (error) {
    console.error('sendNewsletterBroadcast error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}