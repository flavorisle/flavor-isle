import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { Resend } from 'npm:resend@3.2.0';
import { brandedEmailHtml } from '../../shared/sendOrderEmails.ts';

// Public newsletter subscription with double opt-in. Creates a pending
// EmailSubscriber and sends a confirmation email with a one-time confirm
// link. Nothing is active until the subscriber clicks the confirm link
// (handled by confirmEmailSubscription). Re-subscribes (pending or
// previously unsubscribed) re-issue a token and re-send the confirmation.
const FROM = 'Flavor Isle <smashie@order.flavor-isle.com>';
const APP_BASE = 'https://taste-isle-express.base44.app';

function normalizeEmail(e) { return (e || '').toLowerCase().trim(); }
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function newToken() { return crypto.randomUUID() + Math.random().toString(36).slice(2); }

async function sendConfirmation(email, confirmToken) {
  const confirmLink = `${APP_BASE}/confirm-subscription?token=${encodeURIComponent(confirmToken)}`;
  const bodyHtml = `
    <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey friend,</p>
    <h2 style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 8px;">Confirm your Flavor Isle updates</h2>
    <p style="color:#141414;font-size:16px;margin:0 0 14px;">You're almost on the list! Tap the button below to confirm your subscription and start getting updates on new menu items, seasonal shakes, and special events.</p>
    <a href="${confirmLink}" style="display:inline-block;background:#C0392B;color:#fff;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:12px 26px;border-radius:999px;font-size:14px;font-weight:bold;">CONFIRM MY SUBSCRIPTION</a>
    <p style="color:#999;font-size:13px;margin:14px 0 0;">If you didn't sign up, you can ignore this email — nothing happens until you confirm.</p>`;
  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const { error } = await resend.emails.send({ from: FROM, to: email, subject: 'Confirm your Flavor Isle updates', html: brandedEmailHtml(bodyHtml) });
    if (error) console.error('subscribeEmail confirmation send error:', error);
  } catch (err) {
    console.error('subscribeEmail confirmation exception:', err.message);
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const email = normalizeEmail(body?.email);
    const source = body?.source || 'footer';
    if (!isValidEmail(email)) return Response.json({ error: 'A valid email address is required.' }, { status: 400 });

    const confirmToken = newToken();
    const existing = await base44.asServiceRole.entities.EmailSubscriber.filter({ email });
    if (existing[0]) {
      const sub = existing[0];
      if (sub.status === 'active') {
        // Already confirmed — don't re-send. Tell the UI they're subscribed.
        return Response.json({ ok: true, alreadyActive: true });
      }
      // pending or unsubscribed → re-issue confirm token and re-send.
      await base44.asServiceRole.entities.EmailSubscriber.update(sub.id, {
        status: 'pending',
        confirm_token: confirmToken,
        unsubscribe_token: sub.unsubscribe_token || newToken(),
        source,
        unsubscribed_at: null,
      });
      await sendConfirmation(email, confirmToken);
      return Response.json({ ok: true, pending: true });
    }

    await base44.asServiceRole.entities.EmailSubscriber.create({
      email,
      status: 'pending',
      confirm_token: confirmToken,
      unsubscribe_token: newToken(),
      source,
    });
    await sendConfirmation(email, confirmToken);
    return Response.json({ ok: true, pending: true });
  } catch (error) {
    console.error('subscribeEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}