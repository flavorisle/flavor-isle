// Bundle price authority (mirrors src/config/familyBundle.js and
// src/config/weekendPartyPack.js). Used by verifyOrderPricing so every bundle's
// fixed price is recomputed from the catalog, never trusted from the client.
//
// The rule: every priced option on a bundle line that is NOT one of that
// bundle's included allowances is a paid extra. The bundle price covers
// everything else, so
//
//   bundle discount = Σ over bundle groups ( included portion − bundle price )
//
// which makes the discounted subtotal exactly the bundle price plus the chosen
// extras.

export const FAMILY_BUNDLE_ID = 'school-night-lifesaver';
export const FAMILY_BUNDLE_PRICE = 37.74;
export const WEEKEND_PARTY_PACK_ID = 'weekend-party-pack';
export const WEEKEND_PARTY_PACK_PRICE = 41.99;

// Option ids whose upcharge the bundle price already includes.
export const FAMILY_BUNDLE_INCLUDED_OPTION_IDS = new Set([
  'Y2EF7HFNOIASMLYU4VJLZEND', // Cheeseburger — Lettuce (Regular)
  'XZYVFBRPM75A7QKEL6MNH3SJ', // Cheeseburger — Tomato (Regular)
  'T3V2NMQW4YQWUITPBEEILION', // Classic Drinks — 14 oz
]);

export interface BundleRule {
  price: number;
  includedOptionIds: Set<string>;
  label: string;
}

export const BUNDLES: Record<string, BundleRule> = {
  [FAMILY_BUNDLE_ID]: {
    price: FAMILY_BUNDLE_PRICE,
    includedOptionIds: FAMILY_BUNDLE_INCLUDED_OPTION_IDS,
    label: 'School Night Lifesaver Bundle',
  },
  // The Weekend Party Pack's picks are all $0 options on their items, so the
  // only money the $41.99 covers is the item prices themselves; any priced
  // option a cart attaches to a pack line is a paid extra on top of $41.99.
  [WEEKEND_PARTY_PACK_ID]: {
    price: WEEKEND_PARTY_PACK_PRICE,
    includedOptionIds: new Set<string>(),
    label: 'Weekend Party Pack',
  },
};

export function bundleForLine(item: any): BundleRule | null {
  return item?.bundleId ? BUNDLES[item.bundleId] || null : null;
}

export function isBundleLine(item: any): boolean {
  return bundleForLine(item) !== null;
}

export function bundleLabelFor(id?: string): string {
  return (id && BUNDLES[id]?.label) || '';
}

// Sum of the prices each bundle's fixed price already covers, per bundle group.
// Each added bundle carries its own share of included money, so two bundles in
// one order, two different bundles, and a partly-edited bundle all stay exact.
export function bundleDiscountForLines(
  lines: Array<{ bundleId?: string; bundleGroup?: string; includedUnitPrice: number; quantity: number }>,
): number {
  const groups: Record<string, { bundleId: string; included: number }> = {};
  for (const line of lines || []) {
    const bundleId = line.bundleId && BUNDLES[line.bundleId] ? line.bundleId : FAMILY_BUNDLE_ID;
    const key = line.bundleGroup || bundleId;
    const group = (groups[key] ||= { bundleId, included: 0 });
    group.included += (Number(line.includedUnitPrice) || 0) * (Number(line.quantity) || 1);
  }
  const discount = Object.values(groups).reduce(
    (sum, group) => sum + Math.max(0, group.included - (BUNDLES[group.bundleId]?.price || FAMILY_BUNDLE_PRICE)),
    0,
  );
  return Math.round((discount + Number.EPSILON) * 100) / 100;
}