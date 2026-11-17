// The everyday items quoted in the site's "what does it cost" answers, priced
// from the live menu so a quoted number can never drift from what the customer
// is actually charged. Shared by the FAQ page and the Mammoth Cave page.
export const PRICE_SAMPLES = ['Hamburger', 'Cheeseburger', 'French Fries', 'Onion Rings', 'Malt'];

// "hamburger $4.25, cheeseburger $5.25, …" — drops any sample the menu no
// longer has, and returns '' when nothing matches so callers can skip prices.
export function priceLine(items) {
  const byName = new Map((items || []).map((item) => [item.name, Number(item.price)]));
  return PRICE_SAMPLES
    .filter((name) => byName.get(name) > 0)
    .map((name) => `${name.toLowerCase()} $${byName.get(name).toFixed(2)}`)
    .join(', ');
}