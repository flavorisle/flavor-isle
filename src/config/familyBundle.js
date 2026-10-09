// The School Night Lifesaver — family bundle definition (issue #84).
//
// BUILD IS INACTIVE: FAMILY_BUNDLE_ENABLED stays FALSE until Wesley gives a
// separate go-live word. While it is false nothing renders on the live site.
//
// Every id below is a real live catalog id pulled from MenuItem (Square ids are
// mirrored here only for reference — the items themselves carry their own
// square_item_id, so orders sync to Square like any other order).

export const FAMILY_BUNDLE_ENABLED = false;

export const FAMILY_BUNDLE = {
  id: 'school-night-lifesaver',
  title: 'The School Night Lifesaver',
  subtitle: '2 Cheeseburgers • 4 Mini Cheeseburgers • 2 Sides • 4 Drinks • Hot Fudge Cake',
  flatLabel: '$40 flat, tax included',
  price: 37.74, // fixed bundle price with the included defaults, before tax
  priceNote: '($37.74 + tax)',
  aLaCarteNote: 'A la carte the same spread is $41.33 ($43.81 with tax)',
  // Option ids whose upcharge is INCLUDED in the $37.74 (never charged extra).
  // Every other priced option chosen on a bundle line is a paid extra that adds
  // on top of the bundle price and is taxed normally.
  includedOptionIds: [
    'Y2EF7HFNOIASMLYU4VJLZEND', // Cheeseburger — Lettuce (Regular) +$0.25
    'XZYVFBRPM75A7QKEL6MNH3SJ', // Cheeseburger — Tomato (Regular) +$0.50
    'T3V2NMQW4YQWUITPBEEILION', // Classic Drinks — 14 oz size +$0.52
  ],
  // Cheeseburger defaults (pre-selected on both cheeseburgers).
  cheeseburgerDefaults: {
    optionIds: ['Y2EF7HFNOIASMLYU4VJLZEND', 'XZYVFBRPM75A7QKEL6MNH3SJ'],
    // The Lite/Regular/Extra child list both toppings share.
    nested: {
      Y2EF7HFNOIASMLYU4VJLZEND: { 'Preferences on Toppings': 'AOGNALMEXSRP4XDBCMEUZMAI' },
      XZYVFBRPM75A7QKEL6MNH3SJ: { 'Preferences on Toppings': 'AOGNALMEXSRP4XDBCMEUZMAI' },
    },
  },
  // Side slots: only the four approved sides, only Regular / Cajun seasoning.
  sides: {
    itemIds: [
      '6a3e37fc46ef76d538b45d90', // French Fries
      '6a3e37fccf4b3226f54cb838', // Tater Tots
      '6a3e37fd1c33a77fb58c2567', // Curly Fries
      '6a3e380318814640bb3a6bbb', // Cajun Waffle Fries
    ],
    // SIDE MODIFIERS list → REGULAR, SEASON WITH CAJUN only (DOUBLE ORDER is
    // not offered in the bundle, and the fries' cheese list is not either).
    groupOptionAllow: {
      RT53OQRMSIXFBPFTTOYW6MS6: ['ORSL5X7NL235H2V65CDWX262', 'RJR33DWBOQZAREOECPJTDMIO'],
    },
    hiddenGroupIds: ['SYEGRZIKQ7X2A44CV34EAT7L'],
    presetOptionIds: ['ORSL5X7NL235H2V65CDWX262'], // Regular
  },
  // Drink slots: size locked to 14 oz; soda, ice, and paid flavor shots open.
  drinks: {
    itemId: '6a3e37fd8c01988e6d7e40f3', // Classic Drinks
    // Size group has no list id in the catalog — matched by name, the same
    // convention MenuSetting.modifier_overrides uses ('name:Size').
    groupOptionAllow: {
      'name:Size': ['T3V2NMQW4YQWUITPBEEILION'], // 14oz only
    },
    presetOptionIds: ['T3V2NMQW4YQWUITPBEEILION'],
  },
  // Cake slot: the item's own base / cake flavor / paid toppings lists.
  cake: {
    itemId: '6a3e37fecdaa56f271435084', // Hot Fudge Cake
  },
  burger: {
    itemId: '6a3e37fc1825e5b72b711ea2', // Cheeseburger
  },
  mini: {
    itemId: '6a3e37fc437b4ce2af36eb31', // Mini Cheeseburger
  },
};

// The itemized slots, in the order they render on the card.
export const FAMILY_BUNDLE_SLOTS = [
  { key: 'cheeseburger-1', kind: 'burger', label: 'Cheeseburger 1' },
  { key: 'cheeseburger-2', kind: 'burger', label: 'Cheeseburger 2' },
  { key: 'mini-1', kind: 'mini', label: 'Mini Cheeseburger 1' },
  { key: 'mini-2', kind: 'mini', label: 'Mini Cheeseburger 2' },
  { key: 'mini-3', kind: 'mini', label: 'Mini Cheeseburger 3' },
  { key: 'mini-4', kind: 'mini', label: 'Mini Cheeseburger 4' },
  { key: 'side-1', kind: 'side', label: 'Side 1' },
  { key: 'side-2', kind: 'side', label: 'Side 2' },
  { key: 'drink-1', kind: 'drink', label: 'Drink 1 (14 oz)' },
  { key: 'drink-2', kind: 'drink', label: 'Drink 2 (14 oz)' },
  { key: 'drink-3', kind: 'drink', label: 'Drink 3 (14 oz)' },
  { key: 'drink-4', kind: 'drink', label: 'Drink 4 (14 oz)' },
  { key: 'cake', kind: 'cake', label: 'Hot Fudge Cake' },
];