import { isOpenAllDay } from '@/lib/openAllDay';

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

  const allClosed = {
    delivery: true,
    pickup: true,
    dine_in: true,
    deliveryCutoff,
    pickupCutoff,
  };

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: STORE_TZ });

  // Admin-configured temporary full-day closure (e.g. maintenance, weather).
  // When active and today falls within the inclusive date range, every order
  // type is cut off — same as a closed weekday.
  const closure = setting?.closure;
  if (closure?.active) {
    const start = closure.start_date || todayStr;
    const end = closure.end_date || start;
    if (todayStr >= start && todayStr <= end) return allClosed;
  }

  // Date-scoped 24/7 override (MenuSetting.open_all_day_date, optionally
  // stretched by open_all_day_until): while the window is active, ordering stays
  // available around the clock — no morning unlock and no wind-down cutoffs. A
  // fixed window, so it expires on its own; the admin can still pause delivery,
  // and a closure above still wins.
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: STORE_TZ }));
  if (isOpenAllDay(setting, todayStr, now.getHours() * 60 + now.getMinutes())) {
    return { delivery: deliveryPaused, pickup: false, dine_in: false, deliveryCutoff, pickupCutoff };
  }

  const dayKey = DAY_KEYS[(now.getDay() + 6) % 7];
  const today = setting?.business_hours?.[dayKey] || {};
  if (today.closed) return allClosed;

  // Online ordering unlocks at the earlier of 8:00 AM or the store's actual
  // opening time. Most days the store opens at 10:30 so 8 AM lets guests
  // pre-order ahead; on early-open days (e.g. Sunday 5 AM) the store's own
  // open time is used so ordering isn't locked while the store is already open.
  const ORDER_OPEN_MINS = 8 * 60;
  const openMins = toMins(today.open) ?? ORDER_OPEN_MINS;
  const unlockMins = Math.min(ORDER_OPEN_MINS, openMins);
  const closeMins = toMins(today.close) ?? closedFallback;
  const nowMins = now.getHours() * 60 + now.getMinutes();

  if (nowMins < unlockMins) return allClosed;   // before ordering unlocks — locked
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