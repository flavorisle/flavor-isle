// Central time (America/Chicago) formatting helpers so every timestamp shown
// across the site renders in store-local time regardless of the viewer's
// browser timezone. Mirrors the backend busynessTime.ts.
const TZ = 'America/Chicago';

// The platform stores created_date/updated_date as UTC instants WITHOUT a
// timezone designator (e.g. "2026-08-27T19:05:52.647000"). Per the JS Date
// spec a timezone-less ISO string is parsed as LOCAL time, which shifts the
// instant by the viewer's UTC offset and makes the displayed time wrong by
// several hours. Force UTC parsing so the instant is correct everywhere.
export function toUtcDate(iso) {
  if (!iso) return null;
  const s = String(iso);
  const hasTz = /[zZ]$/.test(s) || /[+-]\d\d:?\d\d$/.test(s);
  return hasTz ? new Date(s) : new Date(s + 'Z');
}

export function formatChicagoDateTime(iso, opts) {
  const d = toUtcDate(iso);
  return d ? d.toLocaleString('en-US', { timeZone: TZ, ...(opts || {}) }) : '';
}

export function formatChicagoDate(iso, opts) {
  const d = toUtcDate(iso);
  return d ? d.toLocaleDateString('en-US', { timeZone: TZ, ...(opts || {}) }) : '';
}

export function formatChicagoTime(iso, opts) {
  const d = toUtcDate(iso);
  return d ? d.toLocaleTimeString('en-US', { timeZone: TZ, ...(opts || {}) }) : '';
}