// Server mirror of src/lib/tax.js. Tax, subtotals, and totals are computed in
// WHOLE CENTS and rounded HALF UP, which is the same rule the client cart and
// checkout use — so a 6% tax on an odd-cent subtotal (e.g. $3.25 → $0.195)
// resolves identically on both sides instead of failing price verification.

// KY sales tax, in basis points (600 = 6%). Mirrored on the client.
export const TAX_BASIS_POINTS = 600;

// Round half up to a whole number. Inputs are non-negative.
export function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

// Dollars → whole cents.
export function toCents(dollars: number): number {
  return roundHalfUp((Number(dollars) || 0) * 100);
}

// Whole cents → dollars.
export function fromCents(cents: number): number {
  return cents / 100;
}

// Tax in whole cents for a subtotal given in whole cents. Integer arithmetic
// with half a cent added before truncating = exact round-half-up, no float drift.
export function salesTaxCents(subtotalCents: number, basisPoints: number = TAX_BASIS_POINTS): number {
  return Math.floor((subtotalCents * basisPoints + 5000) / 10000);
}