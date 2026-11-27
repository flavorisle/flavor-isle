// Issue #364 — the "nothing else on it" options.
//
// An option whose WHOLE name is one of these clears its entire multi-select
// group in a single tap, exactly as NO SAUCE has always cleared the sauce
// group, and picking any real option afterwards knocks it back off. One list,
// one rule: every multi-select surface calls isNoneOption, so the behaviour
// cannot drift between the bag, the product page, the quick-add sheet or a
// combo box.
//
// Matching is on the whole name only (case- and whitespace-insensitive, with a
// non-breaking space treated as a space): "No Toppings" and "NO TOPPINGS" both
// match, while "Pickles", "No Toppings, Extra Pickles" or "Chipotle Ranch"
// never do — a real topping that merely contains the word "no" is untouched.
const NONE_OPTION_NAMES = new Set([
  'no sauce',
  'no toppings',
  'plain',
  'none',
  'no cheese',
  'no added flavors',
  'no flavor added',
  'no extra candy',
  'no extra dipping sauce',
  'no dipping sauce',
]);

const normalizeName = (name) => String(name ?? '')
  .replace(/\u00a0/g, ' ')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

export function isNoneOption(name) {
  return NONE_OPTION_NAMES.has(normalizeName(name));
}