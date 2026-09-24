import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { Resend } from 'npm:resend@3.2.0';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { brandedEmailHtml } from '../../shared/sendOrderEmails.ts';

const FROM = 'Flavor Isle <smashie@order.flavor-isle.com>';

// Internal/test emails that should never receive a promo broadcast.
const SKIP_EMAILS = new Set([
  'square-pos@flavorisle.com',
  'wesley@flavor-isle.com',
  'test@example.com',
]);

function isSkipEmail(email) {
  if (!email) return true;
  const e = email.toLowerCase().trim();
  if (SKIP_EMAILS.has(e)) return true;
  if (e.endsWith('@flavorisle.com')) return true;
  return false;
}

// Gather every unique customer email that has placed an online order.
// Pulls from Order records (the source of truth for real customers) and
// dedupes so nobody gets the same promo twice.
async function gatherCustomerEmails(base44) {
  const seen = new Set();
  const emails = [];
  let page = 1;
  // Page through orders in chunks to avoid pulling thousands at once.
  while (page <= 20) {
    const batch = await base44.asServiceRole.entities.Order.list('-created_date', 500, page);
    if (!batch || batch.length === 0) break;
    for (const o of batch) {
      const e = (o.customer_email || '').toLowerCase().trim();
      if (!e || seen.has(e) || isSkipEmail(e)) continue;
      seen.add(e);
      emails.push(e);
    }
    if (batch.length < 500) break;
    page++;
  }
  return emails;
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const { subject, body, test_email } = await req.json();
    if (!subject || !subject.trim()) {
      return Response.json({ error: 'subject is required' }, { status: 400 });
    }
    if (!body || !body.trim()) {
      return Response.json({ error: 'body is required' }, { status: 400 });
    }

    const isTest = !!test_email && test_email.trim();
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const html = brandedEmailHtml(body);

    // ── Test send to a single address ──
    if (isTest) {
      const recipient = test_email.trim();
      const { error } = await resend.emails.send({
        from: FROM,
        to: recipient,
        subject: `[TEST] ${subject}`,
        html,
      });
      if (error) {
        console.error('Promo test send error:', error);
        return Response.json({ ok: false, error: 'email send failed' }, { status: 500 });
      }
      return Response.json({ ok: true, test: true, recipient, sent: 1 });
    }

    // ── Broadcast to all customers ──
    const emails = await gatherCustomerEmails(base44);
    let sent = 0;
    const errors = [];

    for (const email of emails) {
      const { error } = await resend.emails.send({
        from: FROM,
        to: email,
        subject,
        html,
      });
      if (error) {
        errors.push({ email, error: error.message || 'send failed' });
      } else {
        sent++;
      }
    }

    const status = sent > 0 ? (errors.length > 0 ? 'partial' : 'sent') : 'failed';
    console.log(`Promo broadcast: ${sent}/${emails.length} sent, ${errors.length} errors`);
    return Response.json({
      ok: sent > 0,
      sent,
      recipientCount: emails.length,
      errorCount: errors.length,
      status,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    console.error('sendPromoEmailBroadcast error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}