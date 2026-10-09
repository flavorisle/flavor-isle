import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { validTwilioSmsSignature } from '../../shared/twilioSmsSignature.ts';
import { normalizePhone } from '../../shared/sendSmashieSms.ts';

export default async function(req) {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const params = new URLSearchParams(await req.text());
    if (!await validTwilioSmsSignature(req, params)) return new Response('Invalid signature', { status: 403 });
    const base44 = createClientFromRequest(req);
    const sid = params.get('MessageSid') || '';
    const status = params.get('MessageStatus') || '';
    const to = params.get('To') || '';
    const errorCode = params.get('ErrorCode') || '';
    const reason = params.get('ErrorMessage') || (errorCode ? `Twilio delivery error ${errorCode}` : '');
    const ranks = { pending: 0, accepted: 1, scheduled: 1, queued: 1, sending: 2, sent: 3, delivered: 4, undelivered: 4, failed: 4, canceled: 4 };
    if (!sid || ranks[status] == null) return new Response('Invalid status', { status: 400 });
    const logId = new URL(req.url).searchParams.get('log_id');
    const log = logId ? await base44.asServiceRole.entities.SmsDeliveryLog.get(logId) :
      (await base44.asServiceRole.entities.SmsDeliveryLog.filter({ message_sid: sid }))[0];
    if (log) {
      if ((log.message_sid && log.message_sid !== sid) || normalizePhone(to) !== log.phone) return new Response('Message mismatch', { status: 400 });
      if (!['delivered', 'undelivered', 'failed', 'canceled', 'skipped'].includes(log.status) && ranks[status] >= (ranks[log.status] ?? 0)) {
        await base44.asServiceRole.entities.SmsDeliveryLog.updateMany({ id: log.id, status: log.status }, {
          $set: { message_sid: sid, status, error_code: errorCode, reason, status_at: new Date().toISOString() },
        });
      }
    } else if (['failed', 'undelivered'].includes(status) && to) {
      const conversations = await base44.asServiceRole.entities.SmsConversation.filter({ phone_number: to });
      if (conversations[0]) await base44.asServiceRole.entities.SmsConversation.update(conversations[0].id, { last_message_at: new Date().toISOString() });
    }
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('twilioSmsStatus error:', error.message);
    return new Response('Delivery update failed', { status: 500 });
  }
}