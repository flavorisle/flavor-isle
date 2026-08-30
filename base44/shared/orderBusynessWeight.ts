// Busyness weighting: orders containing NO food (only shakes, malts, bliss,
// crave waves, hot fudge cakes, sundaes, floats, drinks and similar treats)
// only count as HALF an order toward kitchen busyness, since they don't hit
// the grill. If an order contains ANY food item — or we can't tell — it
// counts as a full order.

const HALF_WEIGHT = 0.5;

// An item is treated as non-food (treat/drink) when its name matches one of
// these patterns. Anything that doesn't match is assumed to be food.
const NON_FOOD_PATTERNS: RegExp[] = [
  /shake/i,
  /malt/i,
  /bliss/i,
  /crave\s*wave/i,
  /hot\s*fudge/i,
  /sundae/i,
  /float/i,
  /cone/i,
  /ice\s*cream/i,
  /slush/i,
  /smoothie/i,
  /soda/i,
  /\bpop\b/i,
  /\btea\b/i,
  /lemonade/i,
  /coffee/i,
  /\bwater\b/i,
  /drink/i,
  /juice/i,
  /milk\b/i,
];

export function isNonFoodItem(name: string): boolean {
  if (!name) return false;
  return NON_FOOD_PATTERNS.some((p) => p.test(name));
}

// Weight for a Square order object (orders/search result). Returns 0.5 when
// every line item is a treat/drink, 1 otherwise (including no line items).
export function squareOrderWeight(order: { line_items?: Array<{ name?: string }> }): number {
  const items = order?.line_items || [];
  if (!items.length) return 1;
  const allNonFood = items.every((li) => isNonFoodItem(li.name || ''));
  return allNonFood ? HALF_WEIGHT : 1;
}