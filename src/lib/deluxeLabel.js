// Deluxe label logic — supports multiple presets.
//
// A preset is a named set of toppings. When a customer's selection matches a
// preset we show its name ("Deluxe") or "{name}, no <topping>" as toppings are
// removed. Silent toppings are selected by the button but never called out.

const norm = (s) => (s || '').toString().toLowerCase();
// Tolerant stem so "Onion"/"Onions" and "Tomato"/"Tomatoes" match — the config
// uses plural display names but the Square catalog often uses singular.
const stem = (s) => norm(s).replace(/(es|s)$/, '');

// Scores how well a Square modifier option name matches a preset topping name.
//   3 = exact (case-insensitive)
//   2 = equal after singular/plural stemming
//   1 = one name contains the other (handles "DICED ONION" vs "Onions",
//        "Grilled Onions" vs "Onions", "MUSTARD PACKET" vs "Mustard")
//   0 = no match
export function matchScore(modName, topping) {
  const m = norm(modName);
  const t = norm(topping);
  if (!m || !t) return 0;
  if (m === t) return 3;
  const ms = stem(m);
  const ts = stem(t);
  if (ms === ts) return 2;
  if (ms.includes(ts) || ts.includes(ms)) return 1;
  return 0;
}

// Default tracked toppings used only when no presets are passed in
// (backward compat). Mayo is intentionally absent — it's a silent Deluxe
// topping that should never show as "no Mayo".
export const DELUXE_TOPPINGS = ['Mustard', 'Pickles', 'Onions', 'Tomatoes', 'Lettuce'];

// True when a tracked topping is present in the current selection (tolerant).
const toppingPresent = (topping, selectedModifiers) =>
  selectedModifiers.some((m) => matchScore(typeof m === 'string' ? m : m?.name, topping) > 0);

// Builds a human-readable label from the currently selected modifiers.
//
// presets: array of { name, trackedToppings: string[] } — the caller computes
// trackedToppings (preset toppings minus silent ones, optionally restricted to
// what the item actually offers).
//
// Returns the best-matching preset's label, or null when no preset has any
// tracked topping present.
export function buildDeluxeLabel(selectedModifiers, presets) {
  return buildDeluxeLabelFull(selectedModifiers, presets).label;
}

// Same as buildDeluxeLabel, but also returns the full topping list of the
// matched preset (including silent toppings) so callers like the kitchen
// ticket can tell which selected modifiers belong to the preset (and should
// be summarized by the label) versus extras the customer added on top.
export function buildDeluxeLabelFull(selectedModifiers, presets) {
  if (!Array.isArray(selectedModifiers) || selectedModifiers.length === 0) {
  return { label: null, allToppings: [] };
  }

  const list = (Array.isArray(presets) && presets.length > 0)
    ? presets
    : [{ name: 'Deluxe', trackedToppings: DELUXE_TOPPINGS, allToppings: DELUXE_TOPPINGS }];

  let best = null;
  for (const preset of list) {
    const tracked = preset.trackedToppings || [];
    if (tracked.length === 0) continue;
    const present = tracked.filter((t) => toppingPresent(t, selectedModifiers));
    const missing = tracked.filter((t) => !toppingPresent(t, selectedModifiers));
    if (present.length === 0) continue;
    // Fully-matched presets win; among those, the one with the most toppings.
    const score = (missing.length === 0 ? 100000 : 0) + present.length * 100 - missing.length;
    if (!best || score > best.score) {
      best = { name: preset.name, missing, allToppings: preset.allToppings || tracked, score };
    }
  }
  if (!best) return { label: null, allToppings: [] };
  if (best.missing.length === 0) return { label: best.name, allToppings: best.allToppings };
  return { label: `${best.name}, no ${best.missing.join(', no ')}`, allToppings: best.allToppings };
}

// True when at least one default deluxe topping is selected — used to decide
// whether to render the badge at all (backward-compat callers).
export function isDeluxe(selectedModifiers) {
  if (!Array.isArray(selectedModifiers) || selectedModifiers.length === 0) return false;
  return DELUXE_TOPPINGS.some((t) => toppingPresent(t, selectedModifiers));
}