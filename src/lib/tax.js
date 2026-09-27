// Sales-tax math shared by the cart, the checkout summary, and the group-split
// shares. Everything is computed in WHOLE CENTS and rounded HALF UP — the exact
// rule the server's price verification uses (base44/shared/taxMath.ts), so the
// two sides can never disagree by a cent.
//
// Why this exists: tax used to be plain float math (subtotal * 0.06). A single
// $3.25 item taxed exactly $0.195 — the total rounded that half-cent down to
// $3.44 while the tax line displayed $0.20, and the server's round-half-up
// recomputation ($3.45) rejected a perfectly correct cart with
// "Price verification failed: total mismatch".

// KY sales tax, in basis points (600 = 6%). Mirrored on the server.
export const TAX_BASIS_POINTS = 600;

// Round half up to a whole number. Inputs are non-negative.
export function roundHalfUp(value) {
  return Math.floor(value + 0.5);
}

// Dollars → whole cents.
export function toCents(dollars) {
  return roundHalfUp((Number(dollars) || 0) * 100);
}

// Whole cents → dollars.
export function fromCents(cents) {
  return cents / 100;
}

// Tax in whole cents for a subtotal given in whole cents. Integer arithmetic
// with half a cent added before truncating = exact round-half-up, no float drift.
export function salesTaxCents(subtotalCents, basisPoints = TAX_BASIS_POINTS) {
  return Math.floor((subtotalCents * basisPoints + 5000) / 10000);
}

// Tax in dollars for a subtotal given in dollars.
export function salesTaxFor(subtotalDollars, basisPoints = TAX_BASIS_POINTS) {
  return fromCents(salesTaxCents(toCents(subtotalDollars), basisPoints));
}