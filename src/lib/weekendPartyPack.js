// The Weekend Party Pack — client-side helpers.
//
// The pack's fixed price and its discount are recomputed from the cart lines by
// src/lib/familyBundle.js (getFamilyBundleDiscount), whose price map carries
// both bundles, and by base44/shared/familyBundle.ts on the server. This module
// only decides whether the pack is live and how its slots read the real catalog.

import { WEEKEND_PARTY_PACK, WEEKEND_PARTY_PACK_ENABLED } from '@/config/weekendPartyPack';

export const isWeekendPartyPackEnabled = () => WEEKEND_PARTY_PACK_ENABLED === true;

export const isWeekendPartyPackLine = (line) => line?.bundleId === WEEKEND_PARTY_PACK.id;

// Pull a real catalog option off an item so the pack never hardcodes an option
// id: the size it locks (14 oz) and the fries' REGULAR seasoning.
export function catalogOption(item, groupName, matches) {
  const group = (item?.modifiers || []).find((g) => (g.name || '') === groupName);
  const option = (group?.modifiers || []).find((m) => !m.sold_out && matches(m));
  return option ? { id: option.id, name: option.name, price: Number(option.price) || 0 } : null;
}

export const packSizeOption = (item) =>
  catalogOption(item, 'Size', (m) => /14\s*oz/i.test(m.name || ''));

export const packSeasonOption = (item) =>
  catalogOption(item, 'SIDE MODIFIERS', (m) => /^regular$/i.test(m.name || ''));