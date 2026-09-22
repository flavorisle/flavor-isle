import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { sendSmashieSms } from '../../shared/sendSmashieSms.ts';
import { checkSmsConsent, markSmsSent } from '../../shared/smsConsent.ts';

// Send a MARKETING SMS to every active, proven marketing opt-in, or to a
// single test number when `testPhone` is supplied. Marketing is NEVER sent to
// transactional-only or legacy bundled subscribers — only to records with
// marketing_consent=true AND proven_marketing_consent=true AND status=active.
// STOP (status=unsubscribed) suppresses all.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const { message, testPhone, category } = await req.json();
    if (!message || !message.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }
    if (category && category !== 'marketing') {
      return Response.json({ error: 'This function only sends marketing messages' }, { status: 400 });
    }

    // Single test send — still requires proven marketing consent for that number.
    if (testPhone && testPhone.trim()) {
      const consent = await checkSmsConsent(base44, testPhone, 'marketing');
      if (!consent.ok) {
        return Response.json({
          success: false,
          sent: 0,
          recipientCount: 1,
          errors: [{ phone: testPhone, error: `No proven marketing consent (${consent.reason})` }],
        }, { status: 403 });
      }
      const ok = await sendSmashieSms(testPhone, message);
      if (ok) await markSmsSent(base44, testPhone, 'marketing');
      return Response.json({
        success: ok,
        sent: ok ? 1 : 0,
        recipientCount: 1,
        errors: ok ? [] : [{ phone: testPhone, error: 'Twilio send failed — check logs' }],
      });
    }

    // Broadcast to all active, proven marketing opt-ins only.
    const subs = await base44.asServiceRole.entities.SMSSubscriber.filter({
      status: 'active',
      marketing_consent: true,
      proven_marketing_consent: true,
    });

    const errors = [];
    let sent = 0;
    for (const sub of subs) {
      // Re-check per-subscriber in case state changed since the filter (defense in depth).
      if (sub.status !== 'active' || !sub.marketing_consent || !sub.proven_marketing_consent) continue;
      const ok = await sendSmashieSms(sub.phone, message);
      if (ok) {
        sent++;
        await markSmsSent(base44, sub.phone, 'marketing');
      } else {
        errors.push({ phone: sub.phone, error: 'send failed' });
      }
    }

    const status = sent > 0 ? (errors.length > 0 ? 'partial' : 'sent') : 'failed';
    return Response.json({
      success: sent > 0,
      sent,
      recipientCount: subs.length,
      errorCount: errors.length,
      status,
      errors: errors.slice(0, 20),
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}