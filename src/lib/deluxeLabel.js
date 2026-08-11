// Deluxe label logic — supports multiple presets.
//
// A preset is a named set of toppings. When a customer's selection matches a
// preset we show its name ("Deluxe") or "{name}, no <topping>" as toppings are
// removed. Silent toppings are selected by the button but never called out.

const norm = (s) => (s || '').trim().toLowerCase();
// Tolerant stem so "Onion"/"Onions" and "Tomato"/"Tomatoes" match — the config
// uses plural display names but the Square catalog often uses singular.
const stem = (s) => norm(s).replace(/(es|s)$/, '');

// Default tracked toppings used only when no presets are passed in
// (backward compat). Mayo is intentionally absent — it's a silent Deluxe
// topping that should never show as "no Mayo".
export const DELUXE_TOPPINGS = ['Mustard', 'Pickles', 'Onions', 'Tomatoes', 'Lettuce'];

// Builds a human-readable label from the currently selected modifiers.
//
// presets: array of { name, trackedToppings: string[] } — the caller computes
// trackedToppings (preset toppings minus silent ones, optionally restricted to
// what the item actually offers).
//
// Returns the best-matching preset's label, or null when no preset has any
// tracked topping present.
export function buildDeluxeLabel(selectedModifiers, presets) {
  if (!Array.isArray(selectedModifiers) || selectedModifiers.length === 0) return null;

  const selectedStems = selectedModifiers
    .map((m) => (typeof m === 'string' ? m : m?.name))
    .filter(Boolean)
    .map(stem);

  const list = (Array.isArray(presets) && presets.length > 0)
    ? presets
    : [{ name: 'Deluxe', trackedToppings: DELUXE_TOPPINGS }];

  let best = null;
  for (const preset of list) {
    const tracked = preset.trackedToppings || [];
    if (tracked.length === 0) continue;
    const present = tracked.filter((t) => selectedStems.includes(stem(t)));
    const missing = tracked.filter((t) => !selectedStems.includes(stem(t)));
    if (present.length === 0) continue;
    // Fully-matched presets win; among those, the one with the most toppings.
    const score = (missing.length === 0 ? 100000 : 0) + present.length * 100 - missing.length;
    if (!best || score > best.score) {
      best = { name: preset.name, missing, score };
    }
  }
  if (!best) return null;
  if (best.missing.length === 0) return best.name;
  return `${best.name}, no ${best.missing.join(', no ')}`;
}

// True when at least one default deluxe topping is selected — used to decide
// whether to render the badge at all (backward-compat callers).
export function isDeluxe(selectedModifiers) {
  if (!Array.isArray(selectedModifiers) || selectedModifiers.length === 0) return false;
  const selectedStems = selectedModifiers
    .map((m) => (typeof m === 'string' ? m : m?.name))
    .filter(Boolean)
    .map(stem);
  return DELUXE_TOPPINGS.some((t) => selectedStems.includes(stem(t)));
}