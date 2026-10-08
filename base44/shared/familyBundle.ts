// The School Night Lifesaver — server-side price authority (mirrors
// src/config/familyBundle.js). Used by verifyOrderPricing so the bundle
// discount is recomputed from the catalog, never trusted from the client.
//
// The rule: every priced option on a bundle line that is NOT one of the
// included allowances (regular Lettuce, regular Tomato, the 14 oz drink size)
// is a paid extra. The bundle price covers everything else, so
//
//   bundle discount = Σ over bundle groups ( included portion − 37.74 )
//
// which makes the discounted subtotal exactly $37.74 plus the chosen extras.

export const FAMILY_BUNDLE_ID = 'school-night-lifesaver';
export const FAMILY_BUNDLE_PRICE = 37.74;

// Option ids whose upcharge the bundle price already includes.
export const FAMILY_BUNDLE_INCLUDED_OPTION_IDS = new Set([
  'Y2EF7HFNOIASMLYU4VJLZEND', // Cheeseburger — Lettuce (Regular)
  'XZYVFBRPM75A7QKEL6MNH3SJ', // Cheeseburger — Tomato (Regular)
  'T3V2NMQW4YQWUITPBEEILION', // Classic Drinks — 14 oz
]);

export function isBundleLine(item: any): boolean {
  return item?.bundleId === FAMILY_BUNDLE_ID;
}

// Sum of the prices the bundle price already covers, per bundle group. Each
// added bundle carries its own share of included money, so two bundles in one
// order and a partly-edited bundle both stay exact.
export function bundleDiscountForLines(
  lines: Array<{ bundleGroup?: string; includedUnitPrice: number; quantity: number }>,
): number {
  const groups: Record<string, number> = {};
  for (const line of lines || []) {
    const key = line.bundleGroup || FAMILY_BUNDLE_ID;
    groups[key] = (groups[key] || 0) + (Number(line.includedUnitPrice) || 0) * (Number(line.quantity) || 1);
  }
  const discount = Object.values(groups).reduce((sum, included) => sum + Math.max(0, included - FAMILY_BUNDLE_PRICE), 0);
  return Math.round((discount + Number.EPSILON) * 100) / 100;
}