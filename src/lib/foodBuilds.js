// Loaded-fry build cards. Square carries the base fries and the loaded item as
// separate recipes, so each card is the base fries with that loaded item's own
// Square modifier groups stacked on top. Square stays the source of truth:
// group names, options, prices, defaults and rules are printed exactly as the
// catalog holds them.
export const FOOD_BUILDS = [
  {
    key: 'zesty-bacon-ranch-fries',
    name: 'Zesty Bacon Ranch Fries',
    // French Fries — the base the ZBR modifiers stack on.
    base_square_item_id: 'LGEHVSUMWM27XYZX23LRXCQY',
    // Zesty Bacon Ranch French Fries — the stacked modifier groups.
    loaded_square_item_id: 'LNROA5QZR53JS7DGM4TNOZWX',
  },
  {
    key: 'loaded-cajun-chili-waffle-fries',
    name: 'Loaded Cajun Chili Waffle Fries',
    // Cajun Waffle Fries — the base.
    base_square_item_id: 'YVFJWPQED67S3US323ARGLU6',
    // Loaded Cajun Chili Fries — the stacked modifier groups.
    loaded_square_item_id: 'UO47Z5PDHZ23MDOZBKJDW4JY',
  },
];

// The catalog can hold an old copy beside the synced record for one Square id.
// The fullest record wins, so a card always prints the real options.
function pickItem(items, squareItemId) {
  return items
    .filter((item) => item.square_item_id === squareItemId)
    .sort((a, b) =>
      (b.modifiers?.length || 0) - (a.modifiers?.length || 0) ||
      Number(!!(b.image_url_opt || b.image_url)) - Number(!!(a.image_url_opt || a.image_url)))[0] || null;
}

export function deriveFoodBuilds(items = []) {
  return FOOD_BUILDS.map((build) => {
    const base = pickItem(items, build.base_square_item_id);
    const loaded = pickItem(items, build.loaded_square_item_id);
    return { ...build, base, loaded, groups: loaded?.modifiers || [] };
  });
}