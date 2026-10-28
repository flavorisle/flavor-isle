import { normalizePhone, sendSmashieSms, smashieSmsTemplates } from './sendSmashieSms.ts';
import { checkSmsConsent, markSmsSent } from './smsConsent.ts';
import { getSmashieSettings } from './smashieSettings.ts';

// Message consolidation (Oct 28 2026): only confirmed, ready and cancelled are
// still texted. Anything else is logged as skipped and never sent.
const ALLOWED_MILESTONES = new Set(['confirmed', 'ready', 'cancelled']);

export async function sendOrderStatusSms(base44, order, milestone, options = {}) {
  if (!ALLOWED_MILESTONES.has(milestone)) {
    const retired = await base44.asServiceRole.entities.SmsDeliveryLog.create({
      order_id: order.id, order_number: order.order_number, customer_name: order.customer_name || '',
      phone: normalizePhone(order.customer_phone) || '', milestone, body: '',
      status: 'skipped', reason: 'Milestone text retired in the Oct 28 2026 message consolidation',
      status_at: new Date().toISOString(),
    });
    return { sent: false, skipped: true, reason: 'Milestone text retired', log_id: retired.id };
  }
  // One text per poll: if this order already has a live log for this milestone,
  // never text it a second time.
  const prior = await base44.asServiceRole.entities.SmsDeliveryLog.filter({ order_id: order.id, milestone });
  if ((prior || []).some((r) => ['queued', 'sent', 'delivered'].includes(r.status))) {
    return { sent: false, skipped: true, reason: 'Already sent for this order' };
  }
  const cashNote = order.pay_cash_on_pickup && order.payment_status !== 'paid' && ['confirmed', 'ready'].includes(milestone)
    ? ` Pay $${Number(order.total).toFixed(2)} in cash at the counter at pickup.` : '';
  const body = (options.body || smashieSmsTemplates[milestone](order)) + cashNote;
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