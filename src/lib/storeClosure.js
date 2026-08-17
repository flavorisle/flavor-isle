const STORE_TZ = 'America/Chicago';

function todayChicagoDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: STORE_TZ });
}

// Evaluate the admin-configured temporary closure (MenuSetting.closure)
// against today's store-local date. Returns { closed, message }.
// `setting` is the MenuSetting record (or a partial with a `closure` field).
export function evaluateClosure(setting) {
  const c = setting?.closure;
  if (!c || !c.active) return { closed: false, message: '' };
  const today = todayChicagoDate();
  const start = c.start_date || today;
  const end = c.end_date || start;
  if (today >= start && today <= end) {
    return { closed: true, message: c.message || "we're closed today" };
  }
  return { closed: false, message: '' };
}