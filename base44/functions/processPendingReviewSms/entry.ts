import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getSmashieSettings } from '../../shared/smashieSettings.ts';
import { googleReviewSecretUrl } from '../../shared/googleReviewUrl.ts';
import { sendSmashieSms, normalizePhone } from '../../shared/sendSmashieSms.ts';
import { checkSmsConsent, markSmsSent } from '../../shared/smsConsent.ts';

// Post-order Google review request by text — issue #37, step 2.
//
// Two gates, both owned by the owner: the `googleReviewSmsEnabled` toggle in
// SmashieSettings (ships OFF) and the GOOGLE_REVIEW_URL secret. While either is
// off this scanner reports it and sends nothing.
//
// Rules, exactly as approved:
//   • One text per completed order, about two hours after it completed.
//   • Never outside 10 AM–8 PM store local (America/Chicago); a +2h mark that
//     lands outside the window is held to 10 AM the next day.
//   • At most one review request per phone number every 90 days, checked
//     against the SMS delivery log before dispatching.
//   • Only ever the order's own phone number — no other numbers, no blasts.
//
// The completion moment is read once, from the order's own record, and stamped
// on the order as review_sms_due_at so later runs (and later writes to the
// order) can't move the send time.

const REVIEW_MILESTONE = 'review_request';
const CAP_DAYS = 90;
const DELAY_HOURS = 2;
const WINDOW_START_HOUR = 10; // store local, inclusive
const WINDOW_END_HOUR = 20;   // store local, exclusive

function storeLocalDate(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') % 24 };
}

// Offset between America/Chicago and UTC at an instant (handles CST vs CDT).
function storeOffsetMs(date) {
  const p = storeLocalDate(date);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, date.getUTCMinutes(), date.getUTCSeconds());
  return asIfUtc - date.getTime();
}

// The instant at `hour`:00 store local on the store-local day of `anchor`.
function atStoreHour(anchor, hour) {
  const p = storeLocalDate(anchor);
  const guess = new Date(Date.UTC(p.year, p.month - 1, p.day, hour, 0, 0));
  return new Date(guess.getTime() - storeOffsetMs(guess));
}

// Completion + 2 hours, moved into the 10 AM–8 PM store-local window.
function reviewDueAt(completedAt) {
  const target = new Date(completedAt.getTime() + DELAY_HOURS * 60 * 60 * 1000);
  const hour = storeLocalDate(target).hour;
  if (hour < WINDOW_START_HOUR) return atStoreHour(target, WINDOW_START_HOUR);
  if (hour >= WINDOW_END_HOUR) return atStoreHour(new Date(target.getTime() + 24 * 60 * 60 * 1000), WINDOW_START_HOUR);
  return target;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const settings = await getSmashieSettings(base44);
    if (settings.googleReviewSmsEnabled !== true) {
      return Response.json({ ok: true, skipped: true, reason: 'googleReviewSmsEnabled is off' });
    }
    const reviewUrl = googleReviewSecretUrl();
    if (!reviewUrl) {
      return Response.json({ ok: true, skipped: true, reason: 'GOOGLE_REVIEW_URL secret is not set' });
    }

    const orders = await base44.asServiceRole.entities.Order.filter({ status: 'completed' }, '-updated_date', 200);
    const now = Date.now();
    let sent = 0;
    let held = 0;
    let skipped = 0;

    for (const order of orders || []) {
      if (order.review_sms_sent_at) continue;
      if (order.payment_status === 'failed' || order.payment_status === 'refunded') { skipped++; continue; }
      const phone = normalizePhone(order.customer_phone);
      if (!phone) { skipped++; continue; }

      // Stamp the send time once, off the order's own completion moment.
      let due = order.review_sms_due_at ? new Date(order.review_sms_due_at) : null;
      if (!due) {
        const completedAt = new Date(order.updated_date || order.created_date || 0);
        if (!completedAt.getTime()) { skipped++; continue; }
        due = reviewDueAt(completedAt);
        const stamped = await base44.asServiceRole.entities.Order.updateMany(
          { id: order.id, review_sms_due_at: null },
          { $set: { review_sms_due_at: due.toISOString() } },
        );
        if (!stamped || stamped.updated === 0) continue; // another run stamped it first
      }
      if (now < due.getTime()) { held++; continue; }

      // One review request per phone number every 90 days.
      const cutoff = new Date(now - CAP_DAYS * 24 * 60 * 60 * 1000).toISOString();
      const prior = await base44.asServiceRole.entities.SmsDeliveryLog.filter(
        { phone, milestone: REVIEW_MILESTONE }, '-created_date', 20,
      );
      if ((prior || []).some((log) => log.created_date && log.created_date >= cutoff && log.status !== 'failed')) {
        skipped++;
        continue;
      }

      // Same consent gate as every other text on this line: transactional
      // consent on file, otherwise nothing goes out.
      const consent = await checkSmsConsent(base44, phone, 'transactional');
      if (!consent?.ok) { skipped++; continue; }

      // Atomic claim so two overlapping runs can never text the same order twice.
      const claim = await base44.asServiceRole.entities.Order.updateMany(
        { id: order.id, review_sms_sent_at: null },
        { $set: { review_sms_sent_at: new Date().toISOString() } },
      );
      if (!claim || claim.updated === 0) continue;

      const body = `Thanks for grubbing with Flavor Isle! Smashie here — tell Google how we did, takes 10 seconds: ${reviewUrl}`;
      const log = await base44.asServiceRole.entities.SmsDeliveryLog.create({
        order_id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name || '',
        phone,
        milestone: REVIEW_MILESTONE,
        body,
        status: 'pending',
        status_at: new Date().toISOString(),
      });
      const ok = await sendSmashieSms(phone, body, { base44, logId: log.id });
      if (ok) {
        await markSmsSent(base44, phone, 'transactional');
        sent++;
      } else {
        // Delivery failed: clear the send stamp so the next run can try again.
        await base44.asServiceRole.entities.Order.update(order.id, { review_sms_sent_at: null });
        skipped++;
      }
    }

    return Response.json({ ok: true, sent, held, skipped });
  } catch (error) {
    console.error('processPendingReviewSms error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}