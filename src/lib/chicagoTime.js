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

// The store-local calendar day a timestamp falls on, as YYYY-MM-DD. Compare two
// of these to ask "was this today?" on the store's clock rather than the
// viewer's — the Admin Dashboard uses it to tell who has been in today.
export function chicagoDayKey(iso = new Date()) {
  const d = iso instanceof Date ? iso : toUtcDate(iso);
  return d ? d.toLocaleDateString('en-CA', { timeZone: TZ }) : '';
}

// Midnight today, store-local, as a UTC instant — the boundary for "today's
// orders" so the day starts at the store's midnight, not the viewer's.
export function chicagoDayStartIso(date = new Date()) {
  const [y, m, d] = chicagoDayKey(date).split('-').map(Number);
  // Chicago's UTC offset at midday of that date (midday avoids DST edges).
  const midday = new Date(Date.UTC(y, m - 1, d, 12));
  const parts = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(midday)) parts[p.type] = p.value;
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
  const offsetMinutes = Math.round((asUtc - midday.getTime()) / 60000);
  return new Date(Date.UTC(y, m - 1, d) - offsetMinutes * 60000).toISOString();
}