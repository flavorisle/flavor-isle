// The canonical set of toppings that make a burger "Deluxe".
// Matching is case-insensitive and trims whitespace, so "Lettuce", "lettuce",
// and " Lettuce " all resolve to the same topping.
export const DELUXE_TOPPINGS = [
  'Mustard',
  'Pickles',
  'Onions',
  'Tomatoes',
  'Lettuce',
];

const norm = (s) => (s || '').trim().toLowerCase();

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

  const selectedNames = selectedModifiers
    .map((m) => (typeof m === 'string' ? m : m?.name))
    .filter(Boolean)
    .map(norm);

  const missing = DELUXE_TOPPINGS.filter(
    (topping) => !selectedNames.includes(norm(topping))
  );
  const present = DELUXE_TOPPINGS.filter((topping) =>
    selectedNames.includes(norm(topping))
  );

  if (present.length === 0) return null;
  if (missing.length === 0) return 'Deluxe';

  return `Deluxe, no ${missing.join(', no ')}`;
}

// True when at least one deluxe topping is selected — used to decide whether
// to render the badge at all.
export function isDeluxe(selectedModifiers) {
  if (!Array.isArray(selectedModifiers) || selectedModifiers.length === 0) return false;
  const selectedNames = selectedModifiers
    .map((m) => (typeof m === 'string' ? m : m?.name))
    .filter(Boolean)
    .map(norm);
  return DELUXE_TOPPINGS.some((topping) => selectedNames.includes(norm(topping)));
}