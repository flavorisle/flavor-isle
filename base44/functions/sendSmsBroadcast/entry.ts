import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { sendSmashieSms } from '../../shared/sendSmashieSms.ts';

// Send an SMS to every active SMSSubscriber, or to a single test number when
// `testPhone` is supplied. Uses the app's Twilio credentials via sendSmashieSms.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const { message, testPhone } = await req.json();
    if (!message || !message.trim()) {
      return Response.json({ error: 'Message is required' }, { status: 400 });
    }

    // Single test send — no subscriber lookup needed.
    if (testPhone && testPhone.trim()) {
      const ok = await sendSmashieSms(testPhone, message);
      return Response.json({
        success: ok,
        sent: ok ? 1 : 0,
        recipientCount: 1,
        errors: ok ? [] : [{ phone: testPhone, error: 'Twilio send failed — check logs' }],
      });
    }

    // Broadcast to all active, opted-in subscribers.
    const subs = await base44.asServiceRole.entities.SMSSubscriber.filter({
      status: 'active',
      opted_in: true,
    });

    const errors = [];
    let sent = 0;
    for (const sub of subs) {
      const ok = await sendSmashieSms(sub.phone, message);
      if (ok) {
        sent++;
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