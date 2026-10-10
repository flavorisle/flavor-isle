import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { findBlock } from '../../shared/blockedContacts.ts';

// Public Contact form handler. Creates a DURABLE ContactMessage record (the
// admin inbox) BEFORE attempting the inbox email, so a failed send is never
// lost — the record stays as `failed` and can be retried from admin. The email
// is best-effort; API acceptance does NOT guarantee mailbox delivery, so the
// response only confirms the message was received/recorded, not delivered.
//
// Safeguards:
//  - Validation: name/email/message required, length caps.
//  - Rate limit: max 5 messages per client IP per rolling hour.
//  - Dedupe: a recent (10 min) accepted message with the same content hash is
//    not re-emailed — returns ok without a duplicate send.
//  - Retryable: a failed send leaves the record as `failed` (not deleted) so an
//    admin can re-send; the client shows a genuine retryable error.
const INBOX = 'hello@flavor-isle.com';
// Issue #93 (A16): a message from a blocked sender goes to the crew's flagged
// inbox with a visibly flagged subject instead of arriving as normal customer mail.
const FLAGGED_INBOX = 'hello@order.flavor-isle.com';
const RATE_LIMIT_PER_HOUR = 5;
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim().slice(0, 64);
  return (req.headers.get('x-real-ip') || 'unknown').slice(0, 64);
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const name = (body.name || '').toString().trim();
    const email = (body.email || '').toString().trim();
    const message = (body.message || '').toString().trim();

    if (!name || !email || !message) {
      return Response.json({ error: 'Name, email, and message are required.' }, { status: 400 });
    }
    if (name.length > 100 || email.length > 200 || message.length > 4000) {
      return Response.json({ error: 'Message too long.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    const ip = clientIp(req);
    const contentHash = await sha256(`${email.toLowerCase()}|${message}`);

    // ── Rate limit (per IP, rolling hour) ──
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentByIp = await base44.asServiceRole.entities.ContactMessage.filter({ client_ip: ip });
    const recentCount = (recentByIp || []).filter((r: any) => r.created_date && r.created_date >= since).length;
    if (recentCount >= RATE_LIMIT_PER_HOUR) {
      return Response.json({ error: 'Too many messages from your network this hour. Please try again later.' }, { status: 429 });
    }

    // ── Dedupe: don't re-email an already-accepted identical message ──
    const existing = await base44.asServiceRole.entities.ContactMessage.filter({ content_hash: contentHash });
    const dupe = (existing || []).find((r: any) =>
      r.created_date && (Date.now() - new Date(r.created_date).getTime()) < DEDUPE_WINDOW_MS
    );
    if (dupe && dupe.status === 'sent') {
      // Already accepted and emailed — return success without a duplicate send.
      return Response.json({ ok: true, accepted: true, duplicate: true });
    }

    // Issue #93 (A16): a blocked sender's message is never lost — the record is
    // still created, marked 'flagged', and the crew is emailed a copy whose
    // subject says so. The normal path below is untouched for everyone else.
    const block = await findBlock(base44, { email }).catch((e) => {
      console.error('Blocked-contact lookup failed, treating the message as normal:', e.message);
      return null;
    });
    if (block) {
      await base44.asServiceRole.entities.ContactMessage.create({
        name, email, message,
        status: 'flagged',
        client_ip: ip,
        content_hash: contentHash,
      });
      try {
        await base44.integrations.Core.SendEmail({
          to: FLAGGED_INBOX,
          subject: `[FLAGGED - blocked sender] Website Message from ${name}`,
          body: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}\n\nThis sender is on the Flavor Isle block list, so this message was flagged rather than treated as normal customer mail.`,
        });
        return Response.json({ ok: true, accepted: true, flagged: true });
      } catch (mailErr) {
        console.error('Flagged ContactMessage send failed:', mailErr?.message || mailErr);
        return Response.json({ error: 'We recorded your message but the inbox delivery failed. Please try again.' }, { status: 502 });
      }
    }

    // ── Create the durable inbox record (pending) ──
    const record = await base44.asServiceRole.entities.ContactMessage.create({
      name, email, message,
      status: 'pending',
      client_ip: ip,
      content_hash: contentHash,
    });

    // ── Best-effort inbox email ──
    try {
      await base44.integrations.Core.SendEmail({
        to: INBOX,
        subject: `Website Message from ${name}`,
        body: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      });
      await base44.asServiceRole.entities.ContactMessage.update(record.id, {
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
      return Response.json({ ok: true, accepted: true });
    } catch (mailErr) {
      // Keep the record as `failed` so it is not lost and can be retried.
      await base44.asServiceRole.entities.ContactMessage.update(record.id, {
        status: 'failed',
        error_message: String(mailErr?.message || mailErr).slice(0, 1000),
      }).catch(() => {});
      console.error('ContactMessage send failed:', mailErr?.message || mailErr);
      return Response.json({ error: 'We recorded your message but the inbox delivery failed. Please try again.' }, { status: 502 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}