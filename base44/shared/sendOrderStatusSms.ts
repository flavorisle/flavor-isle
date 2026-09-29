import { normalizePhone, sendSmashieSms, smashieSmsTemplates } from './sendSmashieSms.ts';
import { checkSmsConsent, markSmsSent } from './smsConsent.ts';
import { getSmashieSettings } from './smashieSettings.ts';

export async function sendOrderStatusSms(base44, order, milestone, options = {}) {
  const body = options.body || smashieSmsTemplates[milestone](order);
  const log = await base44.asServiceRole.entities.SmsDeliveryLog.create({
    order_id: order.id, order_number: order.order_number, customer_name: order.customer_name || '',
    phone: normalizePhone(order.customer_phone) || '', milestone, body,
    status: 'pending', status_at: new Date().toISOString(),
  });
  try {
    const settings = options.settings || await getSmashieSettings(base44);
    let reason = !order.customer_phone ? 'No customer phone number' :
      settings.sms_status_updates_enabled !== true ? 'Order status texts are disabled' : '';
    if (!reason) {
      const consent = await checkSmsConsent(base44, order.customer_phone, 'transactional');
      if (!consent.ok) reason = consent.reason;
    }
    if (reason) {
      await base44.asServiceRole.entities.SmsDeliveryLog.update(log.id, { status: 'skipped', reason, status_at: new Date().toISOString() });
      return { sent: false, skipped: true, reason, log_id: log.id };
    }
    const sent = await sendSmashieSms(order.customer_phone, body, { base44, logId: log.id });
    if (sent) await markSmsSent(base44, order.customer_phone, 'transactional');
    return { sent, skipped: false, log_id: log.id };
  } catch (error) {
    await base44.asServiceRole.entities.SmsDeliveryLog.update(log.id, { status: 'failed', reason: error.message, status_at: new Date().toISOString() });
    return { sent: false, skipped: false, reason: error.message, log_id: log.id };
  }
}