// Server-side Happy Hour utility — mirrors src/lib/happyHour.js so the backend
// (createPaymentIntent, createSquareOrder) can verify and apply the discount
// using the same store-local (America/Chicago) time window as the client.

const HAPPY_HOUR_DEFAULT = {
  active: true,
  start_time: '14:00',
  end_time: '18:00',
  discount_percent: 50,
  square_item_ids: ['MTOVX3FLW3QYAZRHAXMZMWYN'],
  label: 'Happy Hour — 50% off drinks',
};

export function getHappyHourConfig(setting: any) {
  const hh = setting?.happy_hour;
  if (!hh) return HAPPY_HOUR_DEFAULT;
  return {
    ...HAPPY_HOUR_DEFAULT,
    ...hh,
    square_item_ids: Array.isArray(hh.square_item_ids) && hh.square_item_ids.length > 0
      ? hh.square_item_ids
      : HAPPY_HOUR_DEFAULT.square_item_ids,
  };
}

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function chicagoMinutes(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0';
  let hour = Number(get('hour'));
  if (hour === 24) hour = 0;
  return hour * 60 + Number(get('minute'));
}

export function isHappyHourActive(setting: any): boolean {
  const hh = getHappyHourConfig(setting);
  if (!hh || !hh.active) return false;
  const now = chicagoMinutes();
  const start = timeToMinutes(hh.start_time);
  const end = timeToMinutes(hh.end_time);
  return now >= start && now < end;
}

// Recalculate the happy hour discount from the order items + setting.
// Used by createPaymentIntent to verify the client-sent amount.
export function getHappyHourDiscount(items: any[], setting: any): number {
  if (!isHappyHourActive(setting)) return 0;
  const hh = getHappyHourConfig(setting);
  if (!hh) return 0;
  const pct = (hh.discount_percent || 0) / 100;
  if (pct <= 0) return 0;
  const ids = hh.square_item_ids || [];
  return (items || [])
    .filter((item: any) => ids.includes(item.square_item_id))
    .reduce((sum: number, item: any) => sum + (item.price || 0) * (item.quantity || 1) * pct, 0);
}