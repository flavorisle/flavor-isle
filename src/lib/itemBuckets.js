// Client-side mirror of the backend bucketItem logic in
// sendOrderRecommendationEmail — buckets a menu/cart item into
// MAIN / SIDE / DESSERT / DRINK / OTHER using category + name keywords.
// Kept in sync so the in-cart dessert upsell uses the same rules as the
// post-order recommendation email.
export function bucketItem(item) {
  const name = (item.name || '').toLowerCase();
  const cat = (item.category || item.square_category || item.display_category || '').toLowerCase();

  // DESSERTS — check first so shakes/sundaes never get caught by drink rules
  if (cat === 'shakes') return 'DESSERT';
  if (/ice ?cream|sundae|cake|milkshake|\bshake\b|\bmalt\b|float|bliss|\bpie\b|brownie|cookie|banana split|hot fudge|apple pie|caramel apple/.test(name)) return 'DESSERT';

  // SIDES
  if (cat === 'sides') return 'SIDE';
  if (/fries|tots|onion rings|appetizer|nuggets|mozzarella|jalapeno|loaded|cheese fries|curly fries|chips/.test(name)) return 'SIDE';

  // DRINKS
  if (cat === 'drinks') return 'DRINK';
  if (/coke|pepsi|sprite|dr ?pepper|tea|lemonade|water|juice|coffee|soda|bottled|fountain|mt ?dew|root beer/.test(name)) return 'DRINK';

  // MAINS
  if (cat === 'burgers' || cat === 'chicken' || cat === 'breakfast') return 'MAIN';
  if (/burger|sandwich|melt|hot ?dog|hamburger ?steak|chicken|tender|basket|combo|deluxe|cravewave/.test(name)) return 'MAIN';

  // Specials — infer from the item name
  if (cat === 'specials') {
    if (/burger|sandwich|chicken|hot ?dog|melt/.test(name)) return 'MAIN';
    if (/fries|tots|onion|nuggets/.test(name)) return 'SIDE';
    if (/shake|sundae|cake|pie|bliss/.test(name)) return 'DESSERT';
    if (/coke|tea|lemonade|water|drink/.test(name)) return 'DRINK';
  }

  return 'OTHER';
}