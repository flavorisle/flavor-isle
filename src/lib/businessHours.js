export const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const DAY_LABELS = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
  friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

export const DAY_SHORT = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

export const DEFAULT_BUSINESS_HOURS = {
  monday: { open: '10:30', close: '20:00', closed: false },
  tuesday: { open: '10:30', close: '20:00', closed: false },
  wednesday: { open: '10:30', close: '20:00', closed: false },
  thursday: { open: '10:30', close: '20:00', closed: false },
  friday: { open: '10:30', close: '20:00', closed: false },
  saturday: { open: '10:30', close: '20:00', closed: false },
  sunday: { open: '11:00', close: '20:00', closed: false },
};

export function formatTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return m ? `${h12}:${String(m).padStart(2, '0')}${ap}` : `${h12}${ap}`;
}

export function dayHoursLabel(d) {
  if (!d || d.closed) return 'Closed';
  return `${formatTime12(d.open)} – ${formatTime12(d.close)}`;
}

// Groups consecutive days with identical hours: [{days: 'Monday – Saturday', label: '10:30AM – 8PM'}]
export function hoursGroups(hours, short = false) {
  const names = short ? DAY_SHORT : DAY_LABELS;
  const groups = [];
  DAY_KEYS.forEach(k => {
    const label = dayHoursLabel(hours[k]);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.end = k;
    else groups.push({ start: k, end: k, label });
  });
  return groups.map(g => ({
    days: g.start === g.end ? names[g.start] : `${names[g.start]}${short ? '–' : ' – '}${names[g.end]}`,
    label: g.label,
  }));
}

// Compact one-line summary, e.g. "Mon–Sat: 10:30AM – 8PM · Sun: 11AM – 8PM"
export function hoursSummary(hours) {
  return hoursGroups(hours, true).map(g => `${g.days}: ${g.label}`).join(' · ');
}