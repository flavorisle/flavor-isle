// Frontend mirror of base44/shared/dessertPriority.ts for the cart dessert
// rail. Malts/sundaes are excluded; remaining eligible desserts are sorted by
// fan-favorite rank and rotated by the America/Chicago calendar date so the
// rail varies across days while staying stable within a day.

export function isMaltOrSundae(item) {
  const name = (item?.name || '').toLowerCase();
  return /\bmalt\b/.test(name) || /\bsundae\b/.test(name);
}

export function excludeMaltSundae(items) {
  return (items || []).filter((m) => !isMaltOrSundae(m));
}

export function fanFavoriteSort(a, b) {
  const fa = b.is_fan_favorite ? 1 : 0;
  const fb = a.is_fan_favorite ? 1 : 0;
  if (fa !== fb) return fa - fb;
  return (a.fan_favorite_rank || 999) - (b.fan_favorite_rank || 999);
}

function chicagoDayIndex() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === 'year')?.value || '1970');
  const m = Number(parts.find((p) => p.type === 'month')?.value || '1');
  const d = Number(parts.find((p) => p.type === 'day')?.value || '1');
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function dailyRotate(items) {
  const arr = [...(items || [])];
  if (arr.length <= 1) return arr;
  const offset = chicagoDayIndex() % arr.length;
  return [...arr.slice(offset), ...arr.slice(0, offset)];
}