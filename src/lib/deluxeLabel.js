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
// (backward compat).
export const DELUXE_TOPPINGS = ['Mustard', 'Lettuce', 'Tomato', 'Onion', 'Pickle'];

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

  // If the customer selected Plain or No Sauce, the Deluxe preset is no longer
  // active — drop the preset label entirely and just list the selected items.
  const hasPlainOrNoSauce = selectedModifiers.some((m) => {
    const name = norm(typeof m === 'string' ? m : m?.name || '');
    return /plain/i.test(name) || /no\s*sauce/i.test(name);
  });
  if (hasPlainOrNoSauce) return { label: null, allToppings: [] };

  const list = (Array.isArray(presets) && presets.length > 0)
    ? presets
    : [{ name: 'Deluxe', trackedToppings: DELUXE_TOPPINGS, allToppings: DELUXE_TOPPINGS }];

  const selectedIds = new Set(selectedModifiers.map((m) => m?.id).filter(Boolean));

  let best = null;
  for (const preset of list) {
    const trackedNames = preset.trackedToppings || [];
    const trackedIds = preset.trackedModifierIds || [];
    if (trackedNames.length === 0 && trackedIds.length === 0) continue;

    let presentCount = 0;
    let missing = [];

    if (trackedIds.length > 0) {
      // ID-based matching — reliable: "Dill Pickles" has the same ID as the
      // preset modifier, so it counts as the preset topping, while "Grilled
      // Onions" (different ID) does not.
      trackedIds.forEach((id, i) => {
        if (selectedIds.has(id)) {
          presentCount++;
        } else {
          missing.push(trackedNames[i] || '');
        }
      });
    } else {
      // Name-based fallback (no IDs available)
      trackedNames.forEach((t) => {
        if (toppingPresent(t, selectedModifiers)) {
          presentCount++;
        } else {
          missing.push(t);
        }
      });
    }

    if (presentCount === 0) continue;
    // Only show the Deluxe label when at least half the tracked toppings are
    // present — this distinguishes "Deluxe toggled then a topping removed"
    // from "customer manually picked 1-2 toppings without Deluxe".
    const threshold = Math.ceil((trackedIds.length || trackedNames.length) / 2);
    if (presentCount < threshold) continue;

    const score = (missing.length === 0 ? 100000 : 0) + presentCount * 100 - missing.length;
    if (!best || score > best.score) {
      best = { name: preset.name, missing: missing.filter(Boolean), allToppings: preset.allToppings || trackedNames, score };
    }
  }
  if (!best) return { label: null, allToppings: [] };
  // Full match → "Deluxe"; partial → "Deluxe, no Mustard".
  if (best.missing.length === 0) return { label: best.name, allToppings: best.allToppings };
  return { label: `${best.name}, no ${best.missing.join(', no ')}`, allToppings: best.allToppings };
}

// Builds the full Deluxe label for display on badges, combo summaries, cart
// items, and tickets. Combines the preset label ("Deluxe" or "Deluxe, no X")
// with extras ("add Mayo") and cheese substitutions ("sub Swiss" / "add Swiss").
//
// selectedModifiers: array of { group, name, price, id }
// presets: array of { name, trackedToppings, allToppings }
// item: the menu item (used to detect if cheese is a sub vs add)
//
// Returns { label: string|null, allToppings: string[] } where allToppings is
// the matched preset's full topping list (for kitchen ticket summarization).
export function buildFullDeluxeLabel(selectedModifiers, presets, item) {
  const { label, allToppings } = buildDeluxeLabelFull(selectedModifiers, presets);
  if (!presets || presets.length === 0) return { label, allToppings };

  // ID-based preset topping check — reliable: uses the actual modifier IDs
  // the Deluxe button selects, so "Dill Pickles" (same ID) is a preset
  // topping, while "Grilled Onions" (different ID) is an extra.
  const allPresetModifierIds = new Set();
  presets.forEach(p => {
    (p.allModifierIds || []).forEach(id => allPresetModifierIds.add(id));
  });
  const isPresetTopping = (m) => m?.id && allPresetModifierIds.has(m.id);

  const itemHasCheese = item ? /cheese/i.test(item.name) : false;

  // Detect Plain / No Sauce so we can prefix remaining items with "Only".
  const hasPlainOrNoSauce = selectedModifiers.some((m) => {
    const name = norm(m?.name || '');
    return /plain/i.test(name) || /no\s*sauce/i.test(name);
  });

  const cheeseLabel = (m) => {
    const isCheese = /cheese/i.test(m.name) || /cheese/i.test(m.group || '');
    if (!isCheese) return null;
    return itemHasCheese ? `sub ${m.name}` : `add ${m.name}`;
  };

  if (label) {
    // Deluxe active — extras (non-preset items like Jalapeños, Grilled Onions)
    // get the "add" prefix; preset toppings are summarized by the label.
    // Preset toppings carrying a Lite/Extra preference (merged into the name
    // by the preference pill) are called out so the label says
    // "Deluxe, Extra Mustard" instead of just "Deluxe".
    const prefToppings = selectedModifiers.filter(m => {
      if (!isPresetTopping(m)) return false;
      const n = norm(m.name);
      return n.startsWith('extra ') || n.startsWith('lite ') || n.startsWith('light ');
    });
    const prefLabels = prefToppings.map(m => m.name);
    const extras = selectedModifiers.filter(m => !isPresetTopping(m));
    const extraLabels = extras.map(m => cheeseLabel(m) || `add ${m.name}`);
    const fullLabel = [label, ...prefLabels, ...extraLabels].filter(Boolean).join(', ') || null;
    return { label: fullLabel, allToppings };
  }

  if (hasPlainOrNoSauce) {
    // Plain / No Sauce selected — Deluxe dropped; list remaining items with
    // "Only" prefix (e.g. "Only Mustard, Only Onion").
    const items = selectedModifiers.filter(m => {
      const name = norm(m.name || '');
      return !/plain/i.test(name) && !/no\s*sauce/i.test(name);
    });
    const itemLabels = items.map(m => cheeseLabel(m) || `Only ${m.name}`);
    return { label: itemLabels.join(', ') || null, allToppings: [] };
  }

  // No Deluxe, no Plain — just list selected modifiers by name.
  const itemLabels = selectedModifiers.map(m => cheeseLabel(m) || m.name);
  return { label: itemLabels.join(', ') || null, allToppings: [] };
}

// True when at least one default deluxe topping is selected — used to decide
// whether to render the badge at all (backward-compat callers).
export function isDeluxe(selectedModifiers) {
  if (!Array.isArray(selectedModifiers) || selectedModifiers.length === 0) return false;
  return DELUXE_TOPPINGS.some((t) => toppingPresent(t, selectedModifiers));
}