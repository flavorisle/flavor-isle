// Central time (America/Chicago) formatting helpers so every timestamp shown
// across the site renders in store-local time regardless of the viewer's
// browser timezone. Mirrors the backend busynessTime.ts.
const TZ = 'America/Chicago';

export function formatChicagoDateTime(iso, opts) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', { timeZone: TZ, ...(opts || {}) });
}

export function formatChicagoDate(iso, opts) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { timeZone: TZ, ...(opts || {}) });
}

export function formatChicagoTime(iso, opts) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { timeZone: TZ, ...(opts || {}) });
}