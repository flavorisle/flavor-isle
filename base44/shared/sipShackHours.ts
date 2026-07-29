// The Sip Shack's own limited schedule, in shop-local (America/Chicago) time.
// Mirrors src/lib/sipShackHours.js so emails and the website agree.
const HOURS: Record<number, { open: number; close: number }> = {
  1: { open: 630, close: 1200 }, // Monday 10:30 AM – 8:00 PM
  2: { open: 630, close: 900 },  // Tuesday 10:30 AM – 3:00 PM
  3: { open: 900, close: 1200 }, // Wednesday 3:00 PM – 8:00 PM
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function fmt(mins: number) {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}${m ? `:${String(m).padStart(2, '0')}` : ''} ${period}`;
}

export function sipShackHoursList() {
  return Object.entries(HOURS).map(([day, h]) => ({
    day: DAY_NAMES[Number(day)],
    label: `${fmt(h.open)} – ${fmt(h.close)}`,
  }));
}

function chicagoNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  const weekdayIdx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  return { day: weekdayIdx, mins: Number(get('hour')) % 24 * 60 + Number(get('minute')) };
}

export function sipShackStatus() {
  const { day, mins } = chicagoNow();
  const today = HOURS[day];
  if (today && mins >= today.open && mins < today.close) {
    return { isOpen: true, label: `Available Now · until ${fmt(today.close)}` };
  }
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7;
    const h = HOURS[d];
    if (!h) continue;
    if (i === 0 && mins >= h.open) continue;
    const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY_NAMES[d];
    return { isOpen: false, label: `Not available until ${when} ${fmt(h.open)}` };
  }
  return { isOpen: false, label: 'Not available until Monday 10:30 AM' };
}