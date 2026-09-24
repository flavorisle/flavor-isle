// Canonical server-side unit prices for noncatalog checkout items — items
// sold online that have no Square catalog id (no square_item_id), so
// verifyOrderPricing can't validate them against a MenuItem record. Each entry
// records the approved unit price, consistent with what the site displays, so
// a manipulated client price for these items can never be charged.
//
// Admin-controlled: to change a price, update it here AND in the matching
// client display so they stay consistent. Keyed by the lowercased item name
// (the checkout payload doesn't carry the cart item id, so name is the shared
// identifier). Do NOT invent prices — only record prices already approved and
// shown to customers.
//
// BLOCKER: items not listed here (e.g. Build-Your-Combo line items, whose price
// is computed from multiple catalog components the single line item doesn't
// carry) cannot be server-validated from the current checkout payload and
// remain trusted-with-warning. Wesley's decision is needed to either send
// component-level data for those items or add them here.
export const NONCATALOG_PRICES: Record<string, number> = {
  'flavor isle souvenir mug': 6.0,
};