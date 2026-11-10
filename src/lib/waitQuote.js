// Every pickup / delivery estimate on the site reads from here, off one live
// number, and every quote is a range of three minutes or wider.
//
// The live kitchen wait is a moving number, and printing it to the exact minute
// makes the site promise something the grill cannot honour. So the estimate is
// normalised once, then quoted as a band: pickup = that number, delivery =
// that number, both ±3 minutes. Anything that needs a single minute value (a
// ready time, a schedule slot) uses the normalised number, never the band.

export const QUOTE_SPREAD_MINUTES = 3;

// The one live baseline: a whole minute, never below 10 and never above 90 so a
// stalled busyness read cannot turn into a 300-minute promise.
export function normalizeWait(waitMin) {
  const n = Number(waitMin);
  if (!Number.isFinite(n) || n <= 0) return 20;
  return Math.min(90, Math.max(10, Math.round(n)));
}

// "22–28 min" — never a single minute, and never a zero-width band.
export function quoteRange(waitMin) {
  const base = normalizeWait(waitMin);
  return `${base - QUOTE_SPREAD_MINUTES}\u2013${base + QUOTE_SPREAD_MINUTES} min`;
}

// Pickup and delivery share the baseline, so neither is quietly quoted longer
// than the other.
export function pickupQuote(waitMin) {
  return quoteRange(waitMin);
}

export function deliveryQuote(waitMin) {
  return quoteRange(waitMin);
}