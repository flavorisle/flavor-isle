const DEFAULT_HOURS = {
  monday: { open: '10:30', close: '20:00', closed: false },
  tuesday: { open: '10:30', close: '20:00', closed: false },
  wednesday: { open: '10:30', close: '20:00', closed: false },
  thursday: { open: '10:30', close: '20:00', closed: false },
  friday: { open: '10:30', close: '20:00', closed: false },
  saturday: { open: '10:30', close: '20:00', closed: false },
  sunday: { open: '11:00', close: '20:00', closed: false },
};

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function minutes(time) {
  const [hour, minute] = String(time || '00:00').split(':').map(Number);
  return hour * 60 + minute;
}

function formatTime(time) {
  const [hour, minute] = String(time).split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}${minute ? `:${String(minute).padStart(2, '0')}` : ''} ${period}`;
}

function chicagoParts(now) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const value = (type) => parts.find((part) => part.type === type)?.value || '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(value('weekday'));
  return { day, minute: (Number(value('hour')) % 24) * 60 + Number(value('minute')) };
}

export async function getStoreStatus(base44, now = new Date()) {
  let hours = DEFAULT_HOURS;
  let orderingEnabled = true;

  try {
    const settings = await base44.asServiceRole.entities.MenuSetting.list();
    if (settings?.[0]) {
      hours = { ...DEFAULT_HOURS, ...(settings[0].business_hours || {}) };
      orderingEnabled = settings[0].ordering_enabled !== false;
    }
  } catch (error) {
    console.error('getStoreStatus settings error:', error.message);
  }

  const current = chicagoParts(now);
  const today = hours[DAY_KEYS[current.day]];
  const withinHours = Boolean(today && !today.closed && current.minute >= minutes(today.open) && current.minute < minutes(today.close));
  const isOpen = withinHours && orderingEnabled;

  let nextOpenLabel = '';
  for (let offset = 0; offset < 8; offset += 1) {
    const dayIndex = (current.day + offset) % 7;
    const schedule = hours[DAY_KEYS[dayIndex]];
    if (!schedule || schedule.closed) continue;
    if (offset === 0 && current.minute >= minutes(schedule.open)) continue;
    const dayLabel = offset === 0 ? 'today' : offset === 1 ? 'tomorrow' : DAY_LABELS[dayIndex];
    nextOpenLabel = `${dayLabel} at ${formatTime(schedule.open)}`;
    break;
  }

  return {
    isOpen,
    orderingEnabled,
    openTime: today && !today.closed ? formatTime(today.open) : null,
    closeTime: today && !today.closed ? formatTime(today.close) : null,
    nextOpenLabel: nextOpenLabel || 'during our next scheduled business day',
  };
}