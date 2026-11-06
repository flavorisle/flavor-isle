# Order-update email fallback narrowed to a true backup — issue #158

**Approved by:** Wesley, Nov 5 2026 9:06 PM CT
**Issue:** GitHub #158
**Build:** `npm run build` → exit 0
**Files changed:** `base44/shared/sendOrderStatusSms.ts` (code) and this report. Nothing else.

---

## What was wrong

On Oct 28 2026 the `preparing` and `completed` milestone texts were retired. `sendStatusText` therefore
returned `{ sent: false, skipped: true, reason: 'Milestone text retired' }` for those milestones, and the
email fallback — which fired on **anything that was not a delivered text** — read that deliberate silence as a
delivery failure. On top of that, the dedupe was per milestone rather than per order.

Result: a single web order emailed 3 times when Twilio was healthy (receipt + preparing + completed) and 4
times during a Twilio outage (receipt + preparing + ready + completed). Live `SmsDeliveryLog` rows with reason
`Milestone text retired in the Oct 28 2026 message consolidation` were triggering `sendOrderPreparingEmail`
and `sendOrderCompletedEmail`, confirming it. Wesley's cap is 2 emails per order: the receipt plus at most one
status email.

## What changed, file by file

### `base44/shared/sendOrderStatusSms.ts` — only file changed

1. **Header comment** rewritten: the fallback fires only on a genuine non-delivery (Twilio failure, no consent,
   no phone, texts disabled), one status email per **order**, and retired milestones never email. Names issue
   #158 and the Nov 5 2026 approval.
2. **`MILESTONE_EMAILS` comment** added above the map, stating that only a still-texted milestone can reach it.
   The map itself is unchanged (so re-allowing a milestone as a text automatically restores its email).
3. **`sendStatusText`** now returns `fallback_eligible` and `fallback_reason` on **every** return path. No
   status stamp, log row or existing reason string changed; the try/catch still writes `status: 'failed'`
   with `reason: error.message` to the log row before returning.
4. **`sendMilestoneEmailFallback`** refuses a retired milestone outright, and its dedupe query is now
   **order-level** (`{ order_id }` instead of `{ order_id, milestone }`), with the note vocabulary switched to
   the order wording `Status email already sent for this order`. Every other guard kept as-is: no customer
   email, placeholder `@flavorisle.com` / `@flavorisle.local`, `order_source === 'in_store'`, the
   `email_fallback: 'sending'` claim written before sending, `CLAIM_TTL_MS = 2 minutes`, and the existing
   `sent` / `failed` / `skipped` note strings.
5. **`sendOrderStatusSms`** gates the fallback on `result.fallback_eligible === true` only. The old inference
   (`result.sent || result.reason === 'Already sent for this order'`) is gone. The returned object still
   carries `sent`, `skipped`, `reason`, `log_id`, and gains `email_fallback` only when the fallback ran.

### Net behaviour (requirement 4)

| Scenario | Text | Status emails | Total emails per order |
|---|---|---|---|
| Web order, `preparing` | retired → skipped | **none** (retired) | receipt only |
| Web order, `completed` | retired → skipped | **none** (retired) | receipt only |
| Web order, `ready` sent | delivered | **none** | receipt only |
| Web order, `ready` fails (Twilio down) | failed | **one** — the ready email | receipt + ready = **2** |
| Second milestone fails for the same order | failed | **none** — order already emailed | stays at 2 |

So a Twilio-outage order is receipt + ready email = **2 emails, no more**, which is exactly Wesley's cap.

## Exact final code

### `sendOrderStatusSms` (unchanged tail of the file, verbatim)

```ts
export async function sendOrderStatusSms(base44, order, milestone, options = {}) {
  const result = await sendStatusText(base44, order, milestone, options);

  // Email runs ONLY on a genuine non-delivery (issue #158, approved Nov 5 2026).
  // A text that went out needs nothing more; a retired milestone is deliberate
  // silence, not a failure; a milestone already texted for this order is done.
  if (result.fallback_eligible !== true) return result;

  const emailFallback = await sendMilestoneEmailFallback(base44, order, milestone, result.log_id);
  return emailFallback ? { ...result, email_fallback: emailFallback } : result;
}
```

### `sendStatusText` — changed return paths (verbatim)

```ts
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
```

```ts
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
```

Eligibility values, exactly as specified: retired → `false` / `'Milestone text retired'`; already-sent →
`false` / `'Already sent for this order'`; delivered → `false` / `''`; missing phone, texts disabled, consent
refused, Twilio refused, or a thrown send → `true` with the existing reason text. The one case with no existing
reason string is Twilio returning `false` — `sendSmashieSms` writes its reason to the log row, not to the
caller — so that path uses `fallback_reason: 'Text was not delivered'` and leaves the returned object's shape
untouched.

### `sendMilestoneEmailFallback` — changed parts (verbatim)

```ts
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
```

The send + final stamp block below this (`delivered = (await sendEmail(order, base44)) === true`, then
`email_fallback: delivered ? 'sent' : 'failed'` with the notes `'Status email sent instead of a text'` /
`'Status email could not be sent'`) is unchanged.

## Scope discipline

Not touched: any entity schema, any UI component or page, `cancelOrderFlow.ts`, `fulfillOrder.ts`,
`sendOrderReadyAlert`, `sendOrderEmails.ts`, the text-sending behaviour of `sendOrderStatusSms`
(`sendSmashieSms`, consent, settings, cash note, all log writes), and the object shape callers receive.
Nothing was published. Because `base44/shared/` modules redeploy their importers automatically, the callers
listed in the header comment pick this up without individual redeploys.