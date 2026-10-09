// Reward-tier discount math for the checkout reward panels (issue #83, Part B).
//
// Tier data comes from the squareLoyalty backend, which resolves each tier's
// real Square pricing rule: discount type, scope, and the catalog ids the
// discount applies to. An ORDER-scope reward comes off the subtotal; an
// item-scope reward (a free item, say) comes off the cheapest qualifying line
// in the bag, capped at that line's price and at the subtotal.
//
// This mirrors tierDiscountForCart in base44/shared/squareLoyalty.ts, which
// re-derives the same number on the server before any charge is created.

function lineMatches(line, ids, allItems) {
  if (allItems) return true;
  if (!ids.size) return false;
  const candidates = [
    line?.catalog_object_id,
    line?.square_item_id,
    line?.square_category_id,
    ...((line?.selectedModifiers || []).map((m) => m?.id)),
  ];
  return candidates.some((candidate) => !!candidate && ids.has(String(candidate)));
}

function cheapestQualifyingLinePrice(tier, cartItems) {
  const ids = new Set(tier?.qualifyingItemIds || []);
  const prices = (cartItems || [])
    .filter((line) => lineMatches(line, ids, tier?.allItems === true))
    .map((line) => Number(line?.price) || 0)
    .filter((price) => price > 0);
  return prices.length ? Math.min(...prices) : null;
}

export function computeDiscount(tier, subtotal, cartItems) {
  if (!tier || !tier.discountType) return null;
  const pct = Number(tier.percentage || 0);
  const cents = Number(tier.fixedAmountCents || 0);
  const sub = Math.max(0, Number(subtotal) || 0);

  if ((tier.scope || 'ORDER') === 'ORDER') {
    if (tier.discountType === 'FIXED_AMOUNT') {
      const value = cents / 100;
      return value > 0 ? Math.min(sub, +value.toFixed(2)) : null;
    }
    if (tier.discountType === 'FIXED_PERCENTAGE') {
      if (pct <= 0 || pct >= 100) return null;
      return +((sub * pct) / 100).toFixed(2);
    }
    return null;
  }

  const linePrice = cheapestQualifyingLinePrice(tier, cartItems);
  if (linePrice == null) return null;
  const exact = tier.discountType === 'FIXED_AMOUNT'
    ? Math.min(cents / 100, linePrice)
    : (linePrice * pct) / 100;
  if (!(exact > 0)) return null;
  return +Math.min(exact, sub).toFixed(2);
}

// True when a reward is redeemable online but this bag holds no qualifying
// item, so checkout shows "Add a qualifying item to use" instead of hiding it.
export function tierNeedsCartItem(tier, cartItems) {
  if (!tier || !tier.discountType) return false;
  if ((tier.scope || 'ORDER') === 'ORDER') return false;
  if (tier.allItems) return false;
  if (!(tier.qualifyingItemIds || []).length) return false;
  return cheapestQualifyingLinePrice(tier, cartItems) == null;
}