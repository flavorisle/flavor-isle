// Store-local (America/Chicago) time helper for client-side closing-soon math.
// Mirrors the backend busynessTime.ts so the status bar's "closing soon"
// window stays in sync with the same timezone Square/orders use.

const TZ = 'America/Chicago';
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function chicagoNow() {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'long',
  });
  const parts = {};
  for (const p of fmt.formatToParts(new Date())) parts[p.type] = p.value;
  let hour = parseInt(parts.hour, 10);
  if (Number.isNaN(hour)) hour = 0;
  if (hour === 24) hour = 0;
  let minute = parseInt(parts.minute, 10);
  if (Number.isNaN(minute)) minute = 0;
  const weekday = WEEKDAYS.indexOf(parts.weekday);
  const dayKey = DAY_KEYS[(weekday + 6) % 7];
  return { hour, minute, weekday, dayKey, totalMinutes: hour * 60 + minute };
}