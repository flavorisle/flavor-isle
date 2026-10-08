import { todayChicago } from './busynessTime.ts';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function toMins(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
}

// Compute the next opening time (store-local) as a friendly string like
// "11 AM today" or "10:30 AM Monday". Walks forward day-by-day from `now`
// skipping any day flagged closed, using the actual `open` time configured
// in admin business hours for that day.
function formatHour(time) {
  if (!time) return '';
  const [h, m] = String(time).split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour12}:${String(m).padStart(2, '0')} ${period}` : `${hour12} ${period}`;
}

// MenuSetting.open_all_day_date / open_all_day_until — the date-scoped 24/7
// ordering override used for overnight tests. A plain date covers that one
// store-local day (the original behavior). Setting open_all_day_until
// ("YYYY-MM-DDTHH:MM", store local) stretches the window so it ends at that
// moment, which is how "open now through tomorrow 8 PM" is expressed: start
// date = today, until = tomorrow 20:00. Either way it is fixed and expires on
// its own, and an active closure still wins.
function allDayOverrideActive(s, now) {
  const start = String(s?.open_all_day_date || '').trim();
  if (!start) return false;

  const until = String(s?.open_all_day_until || '').trim().slice(0, 16);
  if (!until) return now.dateKey === start;

  const hh = String(now.hour).padStart(2, '0');
  const mm = String(now.minute).padStart(2, '0');
  const stamp = `${now.dateKey}T${hh}:${mm}`;
  return stamp >= `${start}T00:00` && stamp <= until;
}

const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function nextOpeningTime(businessHours, now) {
  // Same Monday-first index convention getStoreStatus uses for DAY_KEYS.
  const todayIdx = (now.weekday + 6) % 7;

  // If today isn't closed and we're still before today's open time, we open
  // later today at the configured hour.
  const todayHours = (businessHours || {})[DAY_KEYS[todayIdx]] || {};
  const nowMins = now.hour * 60 + now.minute;
  const todayOpenMins = toMins(todayHours.open);
  if (!todayHours.closed && todayOpenMins != null && nowMins < todayOpenMins) {
    return `${formatHour(todayHours.open)} today`;
  }

  // Otherwise scan the next 7 days for the first non-closed day.
  for (let i = 1; i <= 7; i++) {
    const idx = (todayIdx + i) % 7;
    const hours = (businessHours || {})[DAY_KEYS[idx]] || {};
    if (!hours.closed) {
      const label = i === 1 ? 'tomorrow' : DAY_LABELS[idx];
      return `${formatHour(hours.open)} ${label}`;
    }
  }
  return 'soon';
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

    // Date-scoped 24/7 test override (MenuSetting.open_all_day_date, optionally
    // stretched by open_all_day_until): while the window is active, online
    // ordering counts as open around the clock — no 8 AM unlock and no closing
    // time. A fixed window, so it expires on its own; an active closure above
    // still wins.
    const now = todayChicago();
    if (allDayOverrideActive(s, now)) {
      return { open: true, message: '' };
    }

    // Business hours check (store-local time)
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

// Physical store-open check: admin closure + per-day business hours, using
// the ACTUAL configured open time (not the 8 AM online-ordering unlock).
// Returns { open: boolean, message: string }. Used by the voice webhook so
// Smashie's phone greeting reflects when the doors are physically open, not
// when online ordering unlocks. Defaults to open on error.
export async function getPhysicalStoreStatus(base44) {
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

    // Date-scoped 24/7 test override (MenuSetting.open_all_day_date, optionally
    // stretched by open_all_day_until): while the window is active, the phone
    // line counts as open around the clock so Smashie can take orders overnight.
    // A fixed window, so it expires on its own; an active closure above still
    // wins.
    const now = todayChicago();
    if (allDayOverrideActive(s, now)) {
      return { open: true, message: '' };
    }

    // Business hours check (store-local time) — physical doors open at the
    // configured open time, not the 8 AM online-ordering unlock.
    const dayKey = DAY_KEYS[(now.weekday + 6) % 7];
    const dayHours = (s.business_hours || {})[dayKey] || {};
    if (dayHours.closed) return { open: false, message: 'closed today' };

    const openMins = toMins(dayHours.open);
    const closeMins = toMins(dayHours.close) ?? toMins('20:00');
    const nowMins = now.hour * 60 + now.minute;

    if (openMins != null && (nowMins < openMins || nowMins >= closeMins)) {
      const nextOpen = nextOpeningTime(s.business_hours, now);
      return { open: false, message: `we open at ${nextOpen}` };
    }

    return { open: true, message: '' };
  } catch (e) {
    console.error('getPhysicalStoreStatus failed:', e.message);
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