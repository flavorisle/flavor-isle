import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { Resend } from 'npm:resend@3.2.0';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { brandedEmailHtml } from '../../shared/sendOrderEmails.ts';
import { loadBlockFilter } from '../../shared/blockedContacts.ts';

// Issue #146: one-time "create your flavor-isle.com account" email for loyalty
// customers who have no site account. Admin-only, explicit recipient list, never
// a broadcast. Three actions:
//   preview - sends one copy to the admin who called it, nothing else.
//   send    - sends to the exact list in the request, minus every suppression.
//   status  - how many of the list already received it.
//
// Suppression is fail-closed: internal addresses, the block list, and any
// EmailSubscriber marked unsubscribed or bounced are always skipped. Every send
// is logged to NewsletterSend under one broadcast id, so a second click or a
// retry can never email the same person twice.

const FROM = 'Flavor Isle <smashie@flavor-isle.com>';
const APP_BASE = 'https://flavor-isle.com';
const BROADCAST_ID = 'account_invite_2026_11_01';
const MAX_RECIPIENTS = 120; // the approved list is 99; this is the hard ceiling

export const SUBJECT = 'Your Stars are waiting on you (and our new 7 PM close)';

export const BODY = `Hey neighbor,

You've earned Stars with us at Flavor Isle, but you don't have an account on flavor-isle.com yet. That account is where your Star balance, your order history and your birthday reward live, and it takes about a minute to set up.

What an account gets you:
- Your Star balance and past orders in one place
- Reorder your usual in a couple of taps
- 100 Stars on your birthday
- Curbside and dine-in ordering ahead of the line
- First look at new menu items and daily specials

How to sign up:
1. Open flavor-isle.com/register
2. Use the same email this message came to, and the same phone number you give at the counter. That is how your existing Stars get linked to the account.
3. Pick a password, and add your birthday if you want the birthday Stars.
4. Tap Create Account. That is it.

One more thing: our hours just changed. We now close at 7:00 PM every day, Sunday through Saturday. Online ordering shuts off at 7:00, so last pickup orders are in by 6:45. Happy Hour is still 2:00 to 6:00 daily.

See you at the Isle,
Smashie and the Flavor Isle crew`;

function isInternal(email) {
  return !email
    || email.endsWith('@flavorisle.com')
    || email === 'wesleyrbooker1@gmail.com'
    || email.endsWith('@base44.com')
    || email.endsWith('@testagent.base44.com');
}

// Plain-text approved copy -> the same paragraph spacing the newsletter tool uses.
function toBodyHtml(text) {
  return text.split(/\n{2,}/).map((block) => {
    const lines = block.split('\n');
    return `<p style="margin:0 0 14px;">${lines.map((l) =>
      l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    ).join('<br/>')}</p>`;
  }).join('');
}

function unsubscribeFooter(token) {
  const link = token
    ? `${APP_BASE}/unsubscribe?token=${encodeURIComponent(token)}`
    : `${APP_BASE}/unsubscribe`;
  return `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #eee;color:#999;font-size:12px;">You're getting this because you've eaten with us at Flavor Isle. <a href="${link}" style="color:#003366;">Unsubscribe</a> anytime.</p>`;
}

function cleanList(raw) {
  const seen = new Set();
  const out = [];
  for (const value of Array.isArray(raw) ? raw : []) {
    const email = String(value || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email)) continue;
    if (isInternal(email) || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { user, error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'status';
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const html = brandedEmailHtml(toBodyHtml(BODY) + unsubscribeFooter(null));

    if (action === 'preview') {
      const { error } = await resend.emails.send({
        from: FROM, to: user.email, subject: `[PREVIEW] ${SUBJECT}`, html,
      });
      if (error) return Response.json({ ok: false, error: 'preview send failed' }, { status: 500 });
      return Response.json({ ok: true, preview: true, recipient: user.email });
    }

    const recipients = cleanList(body?.recipients);
    if (!recipients.length) {
      return Response.json({ ok: false, error: 'recipients is required' }, { status: 400 });
    }
    if (recipients.length > MAX_RECIPIENTS) {
      return Response.json({
        ok: false,
        error: `recipient list exceeds the approved ceiling of ${MAX_RECIPIENTS}`,
      }, { status: 400 });
    }

    if (action === 'status') {
      const logged = await base44.asServiceRole.entities.NewsletterSend.filter({ broadcast_id: BROADCAST_ID }, '-sent_at', 500);
      const sent = new Set((logged || []).filter((r) => r.status === 'sent').map((r) => String(r.email || '').toLowerCase()));
      return Response.json({
        ok: true,
        approval_size: recipients.length,
        already_sent: recipients.filter((e) => sent.has(e)).length,
        remaining: recipients.filter((e) => !sent.has(e)).length,
      });
    }

    if (action !== 'send') {
      return Response.json({ ok: false, error: 'unknown action' }, { status: 400 });
    }

    // Fail closed: no block list, no send.
    let blockFilter;
    try {
      blockFilter = await loadBlockFilter(base44);
    } catch (e) {
      return Response.json({ ok: false, error: 'block list unavailable, nothing sent' }, { status: 500 });
    }

    // Subscriber rows drive the unsubscribe token and the suppression check.
    // The list is 1,000+ rows, so page through it rather than reading page one.
    const subs = [];
    for (let page = 1; page <= 10; page++) {
      const batch = await base44.asServiceRole.entities.EmailSubscriber.list('-created_date', 500, page);
      if (!batch || batch.length === 0) break;
      subs.push(...batch);
      if (batch.length < 500) break;
    }
    const byEmail = new Map();
    for (const s of subs) byEmail.set(String(s.email || '').toLowerCase(), s);
    const logged = await base44.asServiceRole.entities.NewsletterSend.filter({ broadcast_id: BROADCAST_ID }, '-sent_at', 500);
    const alreadySent = new Set(
      (logged || []).filter((r) => r.status === 'sent').map((r) => String(r.email || '').toLowerCase())
    );

    const result = { ok: true, attempted: 0, sent: 0, skipped: 0, failed: 0, skipped_detail: [] };

    for (const email of recipients) {
      const sub = byEmail.get(email);
      const reason =
        alreadySent.has(email) ? 'already_sent'
          : (sub && ['unsubscribed', 'bounced'].includes(sub.status)) ? `subscriber_${sub.status}`
            : blockFilter.hasEmail(email) ? 'blocked'
              : null;
      if (reason) {
        result.skipped++;
        result.skipped_detail.push(`${email}: ${reason}`);
        continue;
      }

      result.attempted++;
      const token = sub?.unsubscribe_token || null;
      const { error } = await resend.emails.send({
        from: FROM,
        to: email,
        subject: SUBJECT,
        html: brandedEmailHtml(toBodyHtml(BODY) + unsubscribeFooter(token)),
      });

      await base44.asServiceRole.entities.NewsletterSend.create({
        broadcast_id: BROADCAST_ID,
        subscriber_id: sub?.id || '',
        email,
        status: error ? 'failed' : 'sent',
        error: error ? String(error.message || error) : '',
        sent_at: new Date().toISOString(),
      });

      if (error) result.failed++;
      else result.sent++;
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}