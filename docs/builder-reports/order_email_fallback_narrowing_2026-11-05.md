# Order-update email fallback narrowed to a true backup — issue #158

**Approved by:** Wesley, Nov 5 2026 9:06 PM CT
**Issue:** GitHub #158
**File changed:** `base44/shared/sendOrderStatusSms.ts` only
**Build:** `npm run build` → exit 0

## Why

The `preparing` and `completed` milestone texts were retired on Oct 28 2026, so `sendStatusText`
returns `{ sent: false, skipped: true, reason: 'Milestone text retired' }` for them. The fallback
treated any result that was not a delivered text as a delivery failure, and its dedupe was per
milestone. Verified live: `SmsDeliveryLog` rows with reason
`Milestone text retired in the Oct 28 2026 message consolidation` were firing
`sendOrderPreparingEmail` and `sendOrderCompletedEmail`. One web order sent 3 emails when Twilio was
healthy and 4 during an outage; Wesley's cap is 2 per order (receipt + at most one status email).

## What changed in `base44/shared/sendOrderStatusSms.ts`

1. **Header comment** rewritten: the fallback fires only on a genuine non-delivery (Twilio failure, no
   consent, no phone, texts disabled), one status email per **order**, retired milestones never email.
   References issue #158 and the Nov 5 2026 approval.
2. **`sendStatusText`** returns `fallback_eligible` and `fallback_reason` on every path. No status
   stamp, log row or existing reason string changed; the try/catch still writes `status: 'failed'` with
   `reason: error.message` before returning.
3. **`sendMilestoneEmailFallback`** dedupes on the **order** (`filter({ order_id })` instead of
   `{ order_id, milestone }`), note `'Status email already sent for this order'`. Guards, `sending`
   claim, `CLAIM_TTL_MS` (2 min) and the sent/failed notes are unchanged.
4. **`sendOrderStatusSms`** gates on `result.fallback_eligible`; the old inference from `result.sent`
   and the `'Already sent for this order'` string is gone. The returned object still carries `sent`,
   `skipped`, `reason`, `log_id`, and gains `email_fallback` only when the fallback ran.

## Exact final header comment

```ts
// Email fallback — GitHub issue #158, approved by Wesley Nov 5 2026 9:06 PM CT.
// Email is a backup, not a second channel: it fires only on a genuine
// non-delivery (Twilio failure, no consent, no phone, texts disabled).
// At most one status email per order; retired milestones never email.
```

## Exact final code — the three functions, verbatim

### `sendMilestoneEmailFallback`

```ts
async function sendMilestoneEmailFallback(base44, order, milestone, logId) {
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
    // One status email per order (issue #158): claim on the order, not the milestone.
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
    console.error(`Status email dedupe check failed for order ${order.order_number}:`, e.message);
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
    email_fallback_note: delivered ? 'Status email sent instead of a text' : 'Status email could not be sent',
  });
  if (delivered) console.log(`Order ${order.order_number} ${milestone}: email fallback sent to ${order.customer_email}`);
  return { attempted: true, sent: delivered, skipped: !delivered, reason: delivered ? null : 'Status email failed' };
}
```

### `sendStatusText`

```ts
async function sendStatusText(base44, order, milestone, options = {}) {
  if (!ALLOWED_MILESTONES.has(milestone)) {
    const retired = await base44.asServiceRole.entities.SmsDeliveryLog.create({
      order_id: order.id, order_number: order.order_number, customer_name: order.customer_name || '',
      phone: normalizePhone(order.customer_phone) || '', milestone, body: '',
      status: 'skipped', reason: 'Milestone text retired in the Oct 28 2026 message consolidation',
      status_at: new Date().toISOString(),
    });
    return { sent: false, skipped: true, reason: 'Milestone text retired', log_id: retired.id, fallback_eligible: false, fallback_reason: 'Milestone text retired' };
  }
  const prior = await base44.asServiceRole.entities.SmsDeliveryLog.filter({ order_id: order.id, milestone });
  if ((prior || []).some((r) => ['queued', 'sent', 'delivered'].includes(r.status))) {
    return { sent: false, skipped: true, reason: 'Already sent for this order', fallback_eligible: false, fallback_reason: 'Already sent for this order' };
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
    return { sent, skipped: false, log_id: log.id, fallback_eligible: !sent, fallback_reason: sent ? '' : 'Text send failed' };
  } catch (error) {
    await base44.asServiceRole.entities.SmsDeliveryLog.update(log.id, { status: 'failed', reason: error.message, status_at: new Date().toISOString() });
    return { sent: false, skipped: false, reason: error.message, log_id: log.id, fallback_eligible: true, fallback_reason: error.message };
  }
}
```

### `sendOrderStatusSms`

```ts
export async function sendOrderStatusSms(base44, order, milestone, options = {}) {
  const result = await sendStatusText(base44, order, milestone, options);
  // Email is a backup, not a second channel (Nov 5 2026, issue #158): only a
  // text that genuinely could not reach the customer is eligible. A milestone
  // whose text was retired on purpose is not a delivery failure.
  if (!result.fallback_eligible) return result;
  const emailFallback = await sendMilestoneEmailFallback(base44, order, milestone, result.log_id);
  return emailFallback ? { ...result, email_fallback: emailFallback } : result;
}
```

## Net result

| Scenario | Fallback eligible | Status emails | Emails per order |
|---|---|---|---|
| `preparing` (retired) | no | none | receipt only |
| `completed` (retired) | no | none | receipt only |
| `ready` text delivered | no | none | receipt only |
| `ready` text fails (Twilio down) | yes | one — the ready email | receipt + ready = **2** |
| another milestone fails on the same order | yes | none (order already emailed) | stays 2 |

A Twilio-outage web order is receipt + ready email = 2 emails, no more.

## Scope

Untouched: entity schemas, UI, `cancelOrderFlow.ts`, `fulfillOrder.ts`, `sendOrderReadyAlert`,
`sendOrderEmails.ts`, the text-sending behaviour and all log rows of `sendOrderStatusSms`, and the
object shape callers receive. `base44/shared/` modules redeploy their importers automatically, so the
callers above pick this up with no individual redeploy. Nothing was published.