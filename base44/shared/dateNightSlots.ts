// Date Night for Two (issue #357) rides on the group order layer from #356: both
// people's picks are GroupOrderLine rows on ONE GroupOrder, paid once. These rules
// decide which slot an item fills, so the flow is exactly one burger, one side,
// one shake and an optional cake — checked against the live catalog on the server,
// never from what the browser claims.

export type DateNightSlot = 'burger' | 'side' | 'shake' | 'cake';

const keyOf = (item: any) =>
  String(item?.display_category || item?.square_category || item?.category || '');

// The menu's own categories, read live: burgers from the burger category, sides
// from the two snack/fry categories, shakes from the two shake categories, and the
// cakes from the sweets category. Banana Split sits in the sweets category but is
// not a cake, so it is deliberately not offered as the sweet finish.
export function dateNightSlot(item: any): DateNightSlot | null {
  const key = keyOf(item);
  const name = String(item?.name || '').trim();
  if (/twirl|bliss/i.test(key)) return 'shake';
  if (/crunch|snack/i.test(key)) return 'side';
  if (/stacked|sweet/i.test(key)) return /^banana split$/i.test(name) ? null : 'cake';
  if (/burger/i.test(key)) return 'burger';
  return null;
}

// A date night ticket needs these three, and may add at most one cake.
const REQUIRED: DateNightSlot[] = ['burger', 'side', 'shake'];

// Returns a plain-language refusal, or null when the shape is exactly right.
export function dateNightShapeError(slots: (DateNightSlot | null)[]): string | null {
  const counts: Record<DateNightSlot, number> = { burger: 0, side: 0, shake: 0, cake: 0 };
  for (const slot of slots) {
    if (!slot) return 'One of those items is not part of a Date Night.';
    counts[slot] += 1;
  }
  for (const slot of REQUIRED) {
    if (counts[slot] === 0) {
      const label = slot === 'burger' ? 'a burger' : slot === 'side' ? 'a side' : 'a shake';
      return `A Date Night needs ${label} from each of you.`;
    }
    if (counts[slot] > 1) {
      const label = slot === 'burger' ? 'One burger' : slot === 'side' ? 'One side' : 'One shake';
      return `${label} each, please — take one back out.`;
    }
  }
  if (counts.cake > 1) return 'One sweet finish between you is plenty.';
  return null;
}