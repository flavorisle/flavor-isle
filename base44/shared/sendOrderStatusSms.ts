import { normalizePhone, sendSmashieSms, smashieSmsTemplates } from './sendSmashieSms.ts';
import { checkSmsConsent, markSmsSent } from './smsConsent.ts';
import { getSmashieSettings } from './smashieSettings.ts';
import { sendOrderPreparingEmail, sendOrderReadyEmail, sendOrderCompletedEmail } from './sendOrderEmails.ts';

// Message consolidation (Oct 28 2026): only confirmed, ready and cancelled are
// still texted. Anything else is logged as skipped and never sent.
const ALLOWED_MILESTONES = new Set(['confirmed', 'ready', 'cancelled']);

// Email fallback — GitHub issue #158, approved by Wesley Nov 5 2026 9:06 PM CT.
// The email is a TRUE BACKUP: it fires only on a genuine non-delivery of a
// status text (Twilio failure, no consent, no phone number, texts disabled in
// settings). It never fires for a milestone whose text was retired in the
// Oct 28 2026 consolidation (preparing, completed) — that silence is deliberate,
// not a failed send — and never for a text that already reached the customer.
// At most ONE status email per ORDER, whatever the milestone, so an order is at
// most the receipt plus one status email (Wesley's cap of 2 emails per order).
// Every caller (sendOrderReadyAlert, fulfillOrder, syncSquareOrderStatus) gets
// this automatically because it lives here, on the single path every status
// message takes.

// Which email backs which milestone. Only a milestone that is still texted can
// ever reach these — a retired milestone is refused before the lookup below.
const MILESTONE_EMAILS = {
  preparing: sendOrderPreparingEmail,
  ready: sendOrderReadyEmail,
  completed: sendOrderCompletedEmail,
};

// Placeholder addresses on POS/house orders must never receive customer mail.
const PLACEHOLDER_EMAIL = /@flavorisle\.(com|local)$/i;
// A claim older than this is treated as abandoned, so a crashed send cannot
// permanently block the milestone email.
const CLAIM_TTL_MS = 2 * 60 * 1000;

function emailFallbackIneligibleReason(order) {
  const email = String(order?.customer_email || '').trim();
  if (!email) return 'No customer email';
  if (PLACEHOLDER_EMAIL.test(email)) return 'Placeholder customer email';
  if (order?.order_source === 'in_store') return 'In-store order';
  return '';
}

async function noteEmailFallback(base44, logId, fields) {
  if (!logId) return;
  try {
    await base44.asServiceRole.entities.SmsDeliveryLog.update(logId, fields);
  } catch (e) {
    console.error('Email fallback log update failed:', e.message);
  }
}

// Send the status email in place of a text that genuinely did not go out.
// At most once per ORDER (issue #158): the claim is written to the log row
// BEFORE sending, and any 'sent' row — or a live 'sending' claim — for the same
// order stops a second status email, so the Square sync and the admin Ready
// button can never both email the customer about one order.
async function sendMilestoneEmailFallback(base44, order, milestone, logId) {
  // A milestone whose text was retired on purpose never emails (issue #158).
  if (!ALLOWED_MILESTONES.has(milestone)) return null;
  const sendEmail = MILESTONE_EMAILS[milestone];
  if (!sendEmail) return null;

  const ineligible = emailFallbackIneligibleReason(order);
  if (ineligible) {
    await noteEmailFallback(base44, logId, {
      email_fallback: 'skipped', email_fallback_note: ineligible, email_fallback_at: new Date().toISOString(),
    });
    return { attempted: false, sent: false, skipped: true, reason: ineligible };
  }

  await noteEmailFallback(base44, logId, { email_fallback: 'sending', email_fallback_at: new Date().toISOString() });

  try {
    // Order-level, not milestone-level (issue #158): ONE status email per order.
    const rows = await base44.asServiceRole.entities.SmsDeliveryLog.filter({ order_id: order.id });
    const alreadyEmailed = (rows || []).some((r) => {
      if (r.id === logId || !r.email_fallback) return false;
      if (r.email_fallback === 'sent') return true;
      if (r.email_fallback !== 'sending') return false;
      return Date.now() - new Date(r.email_fallback_at || 0).getTime() < CLAIM_TTL_MS;
    });
    if (alreadyEmailed) {
      await noteEmailFallback(base44, logId, {
        email_fallback: 'skipped', email_fallback_note: 'Status email already sent for this order', email_fallback_at: new Date().toISOString(),
      });
      return { attempted: false, sent: false, skipped: true, reason: 'Status email already sent for this order' };
    }
  } catch (e) {
    console.error(`Milestone email dedupe check failed for order ${order.order_number}:`, e.message);
  }

  let delivered = false;
  try {
    delivered = (await sendEmail(order, base44)) === true;
  } catch (e) {
    console.error(`Milestone ${milestone} email failed for order ${order.order_number}:`, e.message);
  }

  await noteEmailFallback(base44, logId, {
    email_fallback: delivered ? 'sent' : 'failed',
    email_fallback_at: new Date().toISOString(),
    email_fallback_note: delivered
      ? 'Status email sent instead of a text'
      : 'Status email could not be sent',
  });
  if (delivered) console.log(`Order ${order.order_number} ${milestone}: email fallback sent to ${order.customer_email}`);
  return { attempted: true, sent: delivered, skipped: !delivered, reason: delivered ? null : 'Milestone email failed' };
}

// The text attempt itself — unchanged behaviour, kept separate so the email
// fallback can run on the paths where a text genuinely did not go out.
// Every return carries fallback_eligible/fallback_reason so the caller never has
// to infer a delivery failure from the wording of a reason (issue #158).
async function sendStatusText(base44, order, milestone, options = {}) {
  if (!ALLOWED_MILESTONES.has(milestone)) {
    const retired = await base44.asServiceRole.entities.SmsDeliveryLog.create({
      order_id: order.id, order_number: order.order_number, customer_name: order.customer_name || '',
      phone: normalizePhone(order.customer_phone) || '', milestone, body: '',
      status: 'skipped', reason: 'Milestone text retired in the Oct 28 2026 message consolidation',
      status_at: new Date().toISOString(),
    });
    return {
      sent: false, skipped: true, reason: 'Milestone text retired', log_id: retired.id,
      fallback_eligible: false, fallback_reason: 'Milestone text retired',
    };
  }
  // One text per poll: if this order already has a live log for this milestone,
  // never text it a second time.
  const prior = await base44.asServiceRole.entities.SmsDeliveryLog.filter({ order_id: order.id, milestone });
  if ((prior || []).some((r) => ['queued', 'sent', 'delivered'].includes(r.status))) {
    return {
      sent: false, skipped: true, reason: 'Already sent for this order',
      fallback_eligible: false, fallback_reason: 'Already sent for this order',
    };
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
      return { sent: false, skipped: true, reason, log_id: log.id, fallback_eligible: true, fallback_reason: reason };
    }
    const sent = await sendSmashieSms(order.customer_phone, body, { base44, logId: log.id });
    if (sent) await markSmsSent(base44, order.customer_phone, 'transactional');
    if (sent) return { sent: true, skipped: false, log_id: log.id, fallback_eligible: false, fallback_reason: '' };
    // Twilio refused the send: the row was stamped failed by sendSmashieSms.
    return {
      sent: false, skipped: false, log_id: log.id,
      fallback_eligible: true, fallback_reason: 'Text was not delivered',
    };
  } catch (error) {
    await base44.asServiceRole.entities.SmsDeliveryLog.update(log.id, { status: 'failed', reason: error.message, status_at: new Date().toISOString() });
    return {
      sent: false, skipped: false, reason: error.message, log_id: log.id,
      fallback_eligible: true, fallback_reason: error.message,
    };
  }
}

export async function sendOrderStatusSms(base44, order, milestone, options = {}) {
  const result = await sendStatusText(base44, order, milestone, options);

  // Email runs ONLY on a genuine non-delivery (issue #158, approved Nov 5 2026).
  // A text that went out needs nothing more; a retired milestone is deliberate
  // silence, not a failure; a milestone already texted for this order is done.
  if (result.fallback_eligible !== true) return result;

  const emailFallback = await sendMilestoneEmailFallback(base44, order, milestone, result.log_id);
  return emailFallback ? { ...result, email_fallback: emailFallback } : result;
}