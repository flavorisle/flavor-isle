// The Weekend Party Pack — bundle definition.
//
// BUILD IS INACTIVE: WEEKEND_PARTY_PACK_ENABLED stays FALSE until Wesley flips
// it after seeing the build. While it is false the card does not render on the
// live site and the print tool shows no pack card.
//
// "Weekend" is the name and the ad hook, not a day limit: the pack sells every
// day. Every id below is a real live MenuItem id from the menu, and its price
// is the authoritative MenuItem price — the pack price itself is fixed here and
// re-enforced on the server (base44/shared/familyBundle.ts).

export const WEEKEND_PARTY_PACK_ENABLED = false;

export const WEEKEND_PARTY_PACK = {
  id: 'weekend-party-pack',
  title: 'Weekend Party Pack',
  subtitle: '12 Mini Cheeseburgers • 2 Fries (mix or match) • 1 Side • 3 Small 14 oz Milkshakes',
  flatLabel: '$41.99',
  price: 41.99, // fixed pack price, before tax
  priceNote: '($41.99 + tax)',
  aLaCarteNote: 'A la carte the same spread is $47.09',
  savings: 5.1,
  // Studio strawberry shake photo already in the app — placeholder until
  // Wesley supplies the final art. No new imagery, no stock.
  image_url: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/1cfd01973_card_strawberry.jpg',
  image_alt: 'Strawberry milkshake',
  pickupNote: 'Pickup at the walk-up window.',
  mini: {
    itemId: '6a3e37fc437b4ce2af36eb31', // Mini Cheeseburger — $1.46
    quantity: 12,
  },
  // Two fries, mix or match. All three are $3.25 in the live menu.
  fries: {
    itemIds: [
      '6a3e37fc46ef76d538b45d90', // French Fries
      '6a3e37fccf4b3226f54cb838', // Tater Tots
      '6a3e380318814640bb3a6bbb', // Cajun Waffle Fries
    ],
  },
  // One side, picked from these two.
  sides: {
    itemIds: [
      '6a3e37fbff57925d93d080b6', // Fried Pickle Chips — $6.60
      '6a3e37fd3b445015f4b5d43e', // Pepper Jack Bites — $6.60
    ],
  },
  // Three small 14 oz shakes. No Bliss shakes, no malts, no sundaes.
  shakes: {
    itemIds: [
      '6a7cca2685fd81fac275c064', // Vanilla Milkshake — $5.49
      '6a7cca2685fd81fac275c065', // Chocolate Milkshake — $5.49
      '6a7cca2685fd81fac275c06c', // Strawberry Milkshake — $5.49
    ],
  },
};

// The pickable slots, in the order they render on the card.
export const WEEKEND_PARTY_PACK_SLOTS = [
  { key: 'fry-1', kind: 'fry', label: 'Fry 1', itemIds: WEEKEND_PARTY_PACK.fries.itemIds },
  { key: 'fry-2', kind: 'fry', label: 'Fry 2', itemIds: WEEKEND_PARTY_PACK.fries.itemIds },
  { key: 'side', kind: 'side', label: 'Side', itemIds: WEEKEND_PARTY_PACK.sides.itemIds },
  { key: 'shake-1', kind: 'shake', label: 'Shake 1 (14 oz)', itemIds: WEEKEND_PARTY_PACK.shakes.itemIds },
  { key: 'shake-2', kind: 'shake', label: 'Shake 2 (14 oz)', itemIds: WEEKEND_PARTY_PACK.shakes.itemIds },
  { key: 'shake-3', kind: 'shake', label: 'Shake 3 (14 oz)', itemIds: WEEKEND_PARTY_PACK.shakes.itemIds },
];