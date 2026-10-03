// Order-pipeline health analysis for the admin dashboard.
//
// Pure function — no network, no React — so the failed-order alert banner and
// the diagnostics panel always show the same numbers, and the rules that decide
// what counts as a "failed order" live in exactly one place.
//
// A failed order is one of:
//   • payment failed (Stripe rejected the charge)
//   • Square push failed, or the order was paid but never landed in Square
//   • a paid order whose staff "new order" alert or customer confirmation email
//     never went out
// Abandoned unpaid checkouts and unaccrued Star Rewards are shown as watch
// items in the panel but never raise the alert banner.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WINDOW_MS = 7 * DAY;

// How long an order may sit in each state before it counts as a problem.
const SYNC_GRACE_MS = 5 * MINUTE; // a push or claim older than this is stuck
const NOTIFY_GRACE_MS = 10 * MINUTE; // emails should land within 10 minutes
const ABANDONED_MS = 30 * MINUTE; // an unpaid checkout left open
const LOYALTY_GRACE_MS = 1 * HOUR;

const ageMs = (value, now) => {
  const t = new Date(value || 0).getTime();
  return Number.isFinite(t) ? now - t : Infinity;
};

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const byNewest = (a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime();

// One row per order/log, in the shape the banner renders. `retryable` marks the
// failures a retry can actually fix (they are re-pushed and re-verified through
// confirmOnlinePayment); a declined card is not retryable from here.
const orderItem = (o, reason, retryable = false) => ({
  id: o.id,
  order_id: o.id,
  order_number: o.order_number,
  customer_name: o.customer_name,
  total: o.total,
  reason,
  retryable,
  at: o.updated_date || o.created_date,
});

const logItem = (l) => ({
  id: l.id,
  order_id: l.order_id,
  order_number: l.order_number,
  customer_name: l.customer_name,
  total: l.total,
  reason: (l.error_message || 'Square push failed').slice(0, 180),
  retryable: true,
  at: l.created_date,
});

// The same order can fail a payment and a push — the banner lists it once.
const dedupeByOrder = (items) => {
  const seen = new Set();
  return items.filter((i) => {
    const key = i.order_id || i.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export function analyzeOrderHealth({ orders = [], logs = [], now = Date.now() }) {
  const online = orders.filter((o) => (o.order_source || 'online') === 'online');
  const paid = online.filter((o) => o.payment_status === 'paid' && o.status !== 'cancelled');
  const unsynced = paid.filter((o) => !o.square_order_id);
  const age = (o) => ageMs(o.updated_date || o.created_date, now);

  const failedPayments = online
    .filter((o) => o.payment_status === 'failed' && ageMs(o.updated_date || o.created_date, now) <= WINDOW_MS)
    .map((o) => orderItem(o, `Payment failed · ${money(o.total)}`))
    .sort(byNewest);

  const failedLogs = logs
    .filter((l) => l.status === 'failed')
    .map(logItem)
    .sort(byNewest);
  const recentFailedLogs = failedLogs.filter((l) => ageMs(l.at, now) <= DAY);

  const stuck = unsynced
    .filter((o) => age(o) > SYNC_GRACE_MS)
    .map((o) => orderItem(o, `Paid ${money(o.total)} · not in Square`))
    .sort(byNewest);
  const staleClaims = unsynced.filter(
    (o) => o.square_sync_claimed_at && ageMs(o.square_sync_claimed_at, now) > SYNC_GRACE_MS,
  );

  const missedKitchen = paid
    .filter((o) => !o.staff_alert_sent_at && ageMs(o.created_date, now) > NOTIFY_GRACE_MS)
    .map((o) => orderItem(o, 'Staff alert email missing'))
    .sort(byNewest);

  const missedConfirmation = paid
    .filter((o) => !o.confirmation_email_sent_at && ageMs(o.created_date, now) > NOTIFY_GRACE_MS)
    .map((o) => orderItem(o, 'Customer confirmation email missing'))
    .sort(byNewest);

  const abandoned = online
    .filter((o) => o.payment_status === 'pending' && o.status !== 'cancelled' && ageMs(o.created_date, now) > ABANDONED_MS)
    .map((o) => orderItem(o, `Left unpaid · ${money(o.total)}`))
    .sort(byNewest);

  const loyaltyPending = paid
    .filter((o) => !o.loyalty_accrued && age(o) > LOYALTY_GRACE_MS)
    .map((o) => orderItem(o, 'Star Rewards points not accrued'))
    .sort(byNewest);

  const checks = [
    {
      key: 'failed_payments',
      label: 'Failed payments',
      hint: 'Stripe refused the charge. The customer was not charged — reach out before they reorder.',
      items: failedPayments,
      severity: failedPayments.length ? 'critical' : 'ok',
      alertable: true,
    },
    {
      key: 'failed_square_push',
      label: 'Failed Square pushes',
      hint: 'A paid order could not be created in Square POS (last 24 hours). Retry re-verifies the payment and pushes it again.',
      items: recentFailedLogs,
      severity: recentFailedLogs.length ? 'critical' : 'ok',
      alertable: true,
    },
    {
      key: 'stuck_sync',
      label: 'Paid but missing from Square',
      hint: staleClaims.length
        ? `${staleClaims.length} of these left a stale sync claim — a push that died mid-flight, safe to retry.`
        : 'Paid online orders with no Square order id. These never reached the kitchen.',
      items: stuck,
      severity: stuck.length ? 'critical' : 'ok',
      alertable: true,
    },
    {
      key: 'missed_kitchen_alert',
      label: 'Kitchen alert not sent',
      hint: 'Paid orders whose "New online order" staff email never went out.',
      items: missedKitchen,
      severity: missedKitchen.length ? 'warning' : 'ok',
      alertable: true,
    },
    {
      key: 'missed_confirmation',
      label: 'Customer confirmation not sent',
      hint: 'Paid orders whose "Order locked in" email never went out.',
      items: missedConfirmation,
      severity: missedConfirmation.length ? 'warning' : 'ok',
      alertable: true,
    },
    {
      key: 'abandoned_checkouts',
      label: 'Abandoned checkouts',
      hint: 'Unpaid online orders left open past 30 minutes. The nightly cleanup closes these.',
      items: abandoned,
      severity: abandoned.length ? 'info' : 'ok',
      alertable: false,
    },
    {
      key: 'loyalty_pending',
      label: 'Star Rewards not accrued',
      hint: 'Paid orders whose Square loyalty points were never added. The status sync self-heals these.',
      items: loyaltyPending,
      severity: loyaltyPending.length ? 'info' : 'ok',
      alertable: false,
    },
  ].map((c) => ({ ...c, count: c.items.length }));

  const alerts = checks
    .filter((c) => c.alertable && c.count > 0)
    .map((c) => ({ ...c, items: dedupeByOrder(c.items) }));

  // Headline count: distinct orders needing attention — an order that failed a
  // payment and a push is still one order.
  const attention = new Set();
  alerts.forEach((a) => a.items.forEach((i) => attention.add(i.order_id || i.id)));

  const newest = alerts
    .flatMap((a) => a.items)
    .map((i) => i.at)
    .filter(Boolean)
    .sort()
    .pop() || null;

  return {
    checks,
    alerts,
    openIssues: attention.size,
    criticalCount: alerts.filter((a) => a.severity === 'critical').length,
    lastFailureAt: newest,
    checkedAt: new Date(now).toISOString(),
  };
}