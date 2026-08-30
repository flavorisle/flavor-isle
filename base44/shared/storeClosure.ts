import { todayChicago } from './busynessTime.ts';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function toMins(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
}

// Compute the next opening time (store-local) as a friendly string like
// "8 AM today" or "8 AM Monday". Walks forward day-by-day from `now` skipping
// any day flagged closed, and uses the 8 AM online-ordering unlock as the open
// time (matches the ORDER_OPEN_MINS gate in getStoreStatus).
function nextOpeningTime(businessHours, now) {
  const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const ORDER_OPEN_HOUR = 8;

  // If we're before 8 AM today and today isn't closed, we open later today.
  const todayKey = DAY_KEYS[now.weekday];
  const todayHours = (businessHours || {})[todayKey] || {};
  const nowMins = now.hour * 60 + now.minute;
  if (!todayHours.closed && nowMins < ORDER_OPEN_HOUR * 60) {
    return `${ORDER_OPEN_HOUR} AM today`;
  }

  // Otherwise scan the next 7 days for the first non-closed day.
  for (let i = 1; i <= 7; i++) {
    const dow = (now.weekday + i) % 7;
    const key = DAY_KEYS[dow];
    const hours = (businessHours || {})[key] || {};
    if (!hours.closed) {
      const label = i === 1 ? 'tomorrow' : DAY_LABELS[dow];
      return `${ORDER_OPEN_HOUR} AM ${label}`;
    }
  }
  return '8 AM';
}

// Full store-open check: admin closure + per-day business hours.
// Returns { open: boolean, message: string }. Defaults to open on error
// so the busyness card never falsely says "Closed" due to a fetch failure.
export async function getStoreStatus(base44) {
  try {
    const list = await base44.asServiceRole.entities.MenuSetting.list();
    const s = (list || [])[0] || {};

    // Admin-configured temporary closure (maintenance, weather, etc.)
    const c = s.closure;
    if (c && c.active) {
      const today = todayChicago().dateKey;
      const start = c.start_date || today;
      const end = c.end_date || start;
      if (today >= start && today <= end) {
        return { open: false, message: c.message || 'closed today' };
      }
    }

    // Business hours check (store-local time)
    const now = todayChicago();
    const dayKey = DAY_KEYS[(now.weekday + 6) % 7];
    const dayHours = (s.business_hours || {})[dayKey] || {};
    if (dayHours.closed) return { open: false, message: 'closed today' };

    // Online ordering unlocks at 8:00 AM daily (earlier than the pickup open),
    // so the live status treats the store as open from 8 AM until closing.
    const ORDER_OPEN_MINS = 8 * 60;
    const closeMins = toMins(dayHours.close) ?? toMins('20:00');
    const nowMins = now.hour * 60 + now.minute;

    if (nowMins < ORDER_OPEN_MINS || nowMins >= closeMins) {
      // Compute the next opening time so Smashie and the status bar can tell
      // customers exactly when we reopen instead of leaving them to guess.
      const nextOpen = nextOpeningTime(s.business_hours, now);
      return { open: false, message: `we open at ${nextOpen}` };
    }

    return { open: true, message: '' };
  } catch (e) {
    console.error('getStoreStatus failed:', e.message);
    return { open: true, message: '' };
  }
}

// Evaluate the admin-configured temporary closure (MenuSetting.closure)
// against today's store-local date. Shared by the voice webhook so Smashie's
// greeting and status context reflect the same closure the website shows.
export async function getStoreClosure(base44) {
  try {
    const list = await base44.asServiceRole.entities.MenuSetting.list();
    const s = (list || [])[0] || {};
    const c = s.closure;
    if (!c || !c.active) return { closed: false, message: '' };
    const today = todayChicago().dateKey;
    const start = c.start_date || today;
    const end = c.end_date || start;
    if (today >= start && today <= end) {
      return { closed: true, message: c.message || 'closed today' };
    }
    return { closed: false, message: '' };
  } catch (e) {
    console.error('getStoreClosure failed:', e.message);
    return { closed: false, message: '' };
  }
}