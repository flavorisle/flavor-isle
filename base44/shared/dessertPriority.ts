// Discretionary promotional item selection (approved Sep 22 correction).
//
// Malts and sundaes are EXCLUDED from all promotional selections and every
// fallback pool — they are never suggested, never used as a fallback, and
// never appear in promotional picks. Remaining eligible items are sorted by
// fan-favorite rank, then rotated by the America/Chicago calendar date so the
// top pick varies across days while staying stable within a day.
//
// This does NOT affect the units-sold homepage Fan Favorites rankings
// (Sundae stays eligible at its real rank); it only changes discretionary
// promo selection. Transactional receipt line items are never altered.

// True for everyday malt or sundae products (excluded from all promo
// selections). Shakes/milkshakes are NOT excluded — only malts and sundaes.
export function isMaltOrSundae(item: any): boolean {
  const name = (item?.name || '').toLowerCase();
  return /\bmalt\b/.test(name) || /\bsundae\b/.test(name);
}

// Remove all malt/sundae products from a pool. Apply to every promotional
// selector and every fallback pool.
export function excludeMaltSundae(items: any[]): any[] {
  return (items || []).filter((m) => !isMaltOrSundae(m));
}

// Fan-favorite first, then fan_favorite_rank ascending.
export function fanFavoriteSort(a: any, b: any): number {
  const fa = b.is_fan_favorite ? 1 : 0;
  const fb = a.is_fan_favorite ? 1 : 0;
  if (fa !== fb) return fa - fb;
  return (a.fan_favorite_rank || 999) - (b.fan_favorite_rank || 999);
}

// Stable day index in America/Chicago (increments once per store-local day).
function chicagoDayIndex(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const y = Number(parts.find((p) => p.type === 'year')?.value || '1970');
  const m = Number(parts.find((p) => p.type === 'month')?.value || '1');
  const d = Number(parts.find((p) => p.type === 'day')?.value || '1');
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

// Rotate a sorted pool by the Chicago calendar day so the top pick varies
// across days while staying stable within a day. No-op for pools of 0-1 items.
export function dailyRotate<T>(items: T[]): T[] {
  const arr = [...(items || [])];
  if (arr.length <= 1) return arr;
  const offset = chicagoDayIndex() % arr.length;
  return [...arr.slice(offset), ...arr.slice(0, offset)];
}