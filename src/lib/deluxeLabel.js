// The canonical set of toppings that make a burger "Deluxe".
// Matching is case-insensitive and trims whitespace, so "Lettuce", "lettuce",
// and " Lettuce " all resolve to the same topping.
export const DELUXE_TOPPINGS = [
  'Mustard',
  'Mayo',
  'Pickles',
  'Onions',
  'Tomatoes',
  'Lettuce',
];

const norm = (s) => (s || '').trim().toLowerCase();
// Tolerant stem so "Onion"/"Onions" and "Tomato"/"Tomatoes" match — the
// Deluxe config uses plural display names but the Square catalog often uses
// singular, and an exact compare would wrongly flag them as missing.
const stem = (s) => norm(s).replace(/(es|s)$/, '');

// Builds a human-readable "Deluxe" label from the currently selected modifiers.
//
// selectedModifiers: array of { name, group, ... } (the shape used by
// ModifierModal / CartContext) OR an array of plain strings.
//
// Returns:
//   - "Deluxe"                         when every deluxe topping is selected
//   - "Deluxe, no Lettuce"             when one topping is missing
//   - "Deluxe, no Lettuce, no Onions"   when several are missing
//   - null                             when no deluxe toppings are selected
//     (the item isn't Deluxe at all — no label should show)
export function buildDeluxeLabel(selectedModifiers) {
  if (!Array.isArray(selectedModifiers) || selectedModifiers.length === 0) return null;

  const selectedStems = selectedModifiers
    .map((m) => (typeof m === 'string' ? m : m?.name))
    .filter(Boolean)
    .map(stem);

  const missing = DELUXE_TOPPINGS.filter(
    (topping) => !selectedStems.includes(stem(topping))
  );
  const present = DELUXE_TOPPINGS.filter((topping) =>
    selectedStems.includes(stem(topping))
  );

  if (present.length === 0) return null;
  if (missing.length === 0) return 'Deluxe';

  return `Deluxe, no ${missing.join(', no ')}`;
}

// True when at least one deluxe topping is selected — used to decide whether
// to render the badge at all.
export function isDeluxe(selectedModifiers) {
  if (!Array.isArray(selectedModifiers) || selectedModifiers.length === 0) return false;
  const selectedStems = selectedModifiers
    .map((m) => (typeof m === 'string' ? m : m?.name))
    .filter(Boolean)
    .map(stem);
  return DELUXE_TOPPINGS.some((topping) => selectedStems.includes(stem(topping)));
}