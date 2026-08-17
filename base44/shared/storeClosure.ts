import { todayChicago } from './busynessTime.ts';

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