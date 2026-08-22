import { todayChicago } from './busynessTime.ts';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function toMins(t) {
  if (!t) return null;
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
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

    const openMins = toMins(dayHours.open) ?? toMins('10:30');
    const closeMins = toMins(dayHours.close) ?? toMins('20:00');
    const nowMins = now.hour * 60 + now.minute;

    if (nowMins < openMins || nowMins >= closeMins) {
      return { open: false, message: 'closed right now' };
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