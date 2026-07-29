// The Sip Shack operates on its own limited schedule, separate from the diner.
// Times are 24h minutes-from-midnight in the shop's local (Central) time.
export const SIP_SHACK_HOURS = {
  1: { open: 630, close: 1200 }, // Monday 10:30 AM – 8:00 PM
  2: { open: 630, close: 900 },  // Tuesday 10:30 AM – 3:00 PM
  3: { open: 900, close: 1200 }, // Wednesday 3:00 PM – 8:00 PM
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function formatMinutes(mins) {
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}${m ? `:${String(m).padStart(2, '0')}` : ''} ${period}`;
}

export function sipShackHoursList() {
  return Object.entries(SIP_SHACK_HOURS).map(([day, h]) => ({
    day: DAY_NAMES[Number(day)],
    label: `${formatMinutes(h.open)} – ${formatMinutes(h.close)}`,
  }));
}

// Returns { isOpen, closesAt, nextDay, nextOpensAt } for the given moment.
export function sipShackStatus(now = new Date()) {
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const today = SIP_SHACK_HOURS[day];

  if (today && mins >= today.open && mins < today.close) {
    return { isOpen: true, closesAt: formatMinutes(today.close) };
  }

  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7;
    const h = SIP_SHACK_HOURS[d];
    if (!h) continue;
    if (i === 0 && mins >= h.open) continue; // today's window already passed
    const nextDay = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY_NAMES[d];
    return { isOpen: false, nextDay, nextOpensAt: formatMinutes(h.open) };
  }
  return { isOpen: false, nextDay: 'Monday', nextOpensAt: '10:30 AM' };
}