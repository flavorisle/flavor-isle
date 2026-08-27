const STORE_TZ = 'America/Chicago';
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const toMins = (t) => {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
};

// Returns which order types are cut off. Honors the store's per-day business
// hours: if today is closed, or the current store-local time is before opening
// or after closing, every type is cut off. Otherwise only the wind-down
// cutoffs near closing apply (delivery gated earlier than pickup/dine-in).
export function getCutoffStatus(setting) {
  const deliveryCutoff = setting?.delivery_cutoff_minutes ?? 30;
  const pickupCutoff = setting?.pickup_cutoff_minutes ?? 15;
  const closedFallback = toMins(setting?.closing_time) ?? toMins('20:00');
  // Admin can pause delivery entirely — it stays unavailable regardless of hours.
  const deliveryPaused = setting?.delivery_enabled === false;

  // Admin-configured temporary full-day closure (e.g. maintenance, weather).
  // When active and today falls within the inclusive date range, every order
  // type is cut off — same as a closed weekday.
  const closure = setting?.closure;
  if (closure?.active) {
    const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: STORE_TZ });
    const start = closure.start_date || todayStr;
    const end = closure.end_date || start;
    if (todayStr >= start && todayStr <= end) return allClosed;
  }

  const allClosed = {
    delivery: true,
    pickup: true,
    dine_in: true,
    deliveryCutoff,
    pickupCutoff,
  };

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: STORE_TZ }));
  const dayKey = DAY_KEYS[(now.getDay() + 6) % 7];
  const today = setting?.business_hours?.[dayKey] || {};
  if (today.closed) return allClosed;

  // Online ordering unlocks at 8:00 AM every day — earlier than the store's
  // pickup open time so guests can pre-order ahead. Pickup/dine-in ready
  // times are clamped to the store open in the schedule picker.
  const ORDER_OPEN_MINS = 8 * 60;
  const closeMins = toMins(today.close) ?? closedFallback;
  const nowMins = now.getHours() * 60 + now.getMinutes();

  if (nowMins < ORDER_OPEN_MINS) return allClosed;   // before 8 AM — ordering locked
  if (nowMins >= closeMins) return allClosed;        // after closing

  const minsToClose = closeMins - nowMins;
  return {
    delivery: deliveryPaused || minsToClose < deliveryCutoff,
    pickup: minsToClose < pickupCutoff,
    dine_in: minsToClose < pickupCutoff,
    deliveryCutoff,
    pickupCutoff,
  };
}