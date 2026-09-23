// Discretionary promotional item selection priority (approved Sep 22 plan).
//
// Non-malt/non-sundae eligible items sort BEFORE malt or sundae items, with
// fan-favorite ranking as the tie-breaker within each priority tier. Malts
// and sundaes remain valid lower-priority fallbacks when alternatives are
// insufficient — they are never excluded, only deprioritized.
//
// This does NOT affect the units-sold homepage Fan Favorites rankings
// (Sundae stays eligible at its real rank); it only changes the order in
// which discretionary promo selectors pick among already-eligible items.

// True for everyday malt or sundae products (the items the priority plan
// deprioritizes). Shakes/milkshakes are NOT demoted — only malts and sundaes.
export function isMaltOrSundae(item: any): boolean {
  const name = (item?.name || '').toLowerCase();
  return /\bmalt\b/.test(name) || /\bsundae\b/.test(name);
}

// Comparator for `.sort(prioritySort)`: non-malt/sundae first, then fan-favorite
// first, then fan_favorite_rank ascending. Callers are responsible for the
// eligibility filters (availability / hidden / photo) before sorting.
export function prioritySort(a: any, b: any): number {
  const aLow = isMaltOrSundae(a) ? 1 : 0;
  const bLow = isMaltOrSundae(b) ? 1 : 0;
  if (aLow !== bLow) return aLow - bLow;
  const fa = b.is_fan_favorite ? 1 : 0;
  const fb = a.is_fan_favorite ? 1 : 0;
  if (fa !== fb) return fa - fb;
  return (a.fan_favorite_rank || 999) - (b.fan_favorite_rank || 999);
}