// Deluxe preset configuration — supports multiple presets ("tags").
//
// A preset is a one-tap shortcut in the modifier modal that selects a fixed
// set of toppings and labels the order with its name — e.g. "Deluxe" — or
// "{name}, no <topping>" as the customer removes individual toppings.
//
// Each preset carries an optional `silentToppings` list: toppings the button
// selects but never calls out as missing (e.g. Mayo is part of a Deluxe but
// shouldn't show "no Mayo").
//
// Storage lives in localStorage so it works on the current frontend branch.
// The read/write surface below is the only place that touches storage, so it
// can be swapped for a server-side entity later without touching components.

// Master switch — set to false to hide all deluxe preset buttons and badges
// from the customer-facing UI. Admin can still manage presets; flipping this
// back to true re-enables the feature everywhere.
export const DELUXE_ENABLED = false;

import { matchScore } from '@/lib/deluxeLabel';

const STORAGE_KEY = 'flavor_isle_deluxe_presets';
const LEGACY_KEY = 'flavor_isle_deluxe_config';

export const DEFAULT_DELUXE_PRESETS = [
  {
    id: 'deluxe',
    name: 'Deluxe',
    toppings: ['Mustard', 'Mayo', 'Pickles', 'Onions', 'Tomatoes', 'Lettuce'],
    silentToppings: ['Mayo'],
    appliesTo: [],
  },
];

const norm = (s) => (s || '').trim().toLowerCase();

function genId() {
  return 'preset_' + Math.random().toString(36).slice(2, 9);
}

export function makeBlankPreset(name = 'New Deluxe') {
  return { id: genId(), name, toppings: [], silentToppings: [], appliesTo: [] };
}

function cleanPreset(p) {
  return {
    id: (p && p.id) || genId(),
    name: (p && p.name && p.name.trim()) || 'Deluxe',
    toppings: Array.isArray(p && p.toppings) ? p.toppings.filter(Boolean) : [],
    silentToppings: Array.isArray(p && p.silentToppings) ? p.silentToppings.filter(Boolean) : [],
    appliesTo: Array.isArray(p && p.appliesTo) ? p.appliesTo : [],
  };
}

// Read all presets, migrating the legacy single-preset config on first load.
export function getDeluxePresets() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // An empty saved list would silently hide every Deluxe button, so fall
      // through to the defaults instead of returning [].
      if (Array.isArray(parsed) && parsed.length > 0) return parsed.map(cleanPreset);
    }
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const lp = JSON.parse(legacy);
      const migrated = [cleanPreset({
        id: 'deluxe',
        name: lp.name || 'Deluxe',
        toppings: lp.toppings || DEFAULT_DELUXE_PRESETS[0].toppings,
        silentToppings: ['Mayo'],
        appliesTo: lp.appliesTo || [],
      })];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    // fall through
  }
  return DEFAULT_DELUXE_PRESETS.map(cleanPreset);
}

export function saveDeluxePresets(presets) {
  const clean = (presets || []).map(cleanPreset);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  return clean;
}

// The topping names a preset's label should track: its toppings minus the
// silent ones. Pass `availableNames` to restrict to toppings actually offered
// on the item (avoids false "no X" for toppings the item doesn't carry).
export function presetTrackedToppings(preset, availableNames) {
  if (!preset) return [];
  const silent = new Set((preset.silentToppings || []).map(norm));
  const base = (preset.toppings || []).filter((t) => !silent.has(norm(t)));
  if (!availableNames) return base;
  // Tolerant: a topping is "available" when any offered option matches it
  // (exact > stem > contains), so "Mustard" stays tracked even when the item
  // only offers "Honey Mustard", and "Onions" when it offers "Grilled Onions".
  return base.filter((t) => availableNames.some((n) => matchScore(n, t) > 0));
}

// Resolves all presets that apply to a specific menu item.
//
// Returns an array of `{ ...preset, modifiers }` where `modifiers` is the
// concrete modifier entries (group + id + name + price) found on the item
// matching the preset's topping names.
export function getDeluxePresetsForItem(item) {
  if (!DELUXE_ENABLED) return [];
  if (!item || !Array.isArray(item.modifiers) || item.modifiers.length === 0) return [];
  const presets = getDeluxePresets();
  const resolved = [];
  for (const preset of presets) {
    if (preset.appliesTo.length > 0 && !preset.appliesTo.includes(item.id)) continue;
    // For each preset topping, pick the single best-matching Square option
    // across all modifier groups (exact > stem > contains) so "Tomatoes" lands
    // on "TOMATO", "Onions" on "DICED ONION"/"Grilled Onions", etc. Taking only
    // the best match avoids selecting two options for one topping.
    const matched = [];
    for (const topping of preset.toppings) {
      let best = null;
      for (const group of item.modifiers) {
        if (!group || !Array.isArray(group.modifiers)) continue;
        for (const mod of group.modifiers) {
          if (!mod || mod.sold_out) continue;
          const score = matchScore(mod.name, topping);
          if (score > 0 && (!best || score > best.score)) {
            best = { score, group: group.name, id: mod.id, name: mod.name, price: mod.price || 0 };
          }
        }
      }
      if (best) matched.push(best);
    }
    if (matched.length === 0) continue;
    resolved.push({ ...preset, modifiers: matched });
  }
  return resolved;
}

// True when every preset modifier is currently selected — used to show the
// active/checked state on a "Make it {name}" button.
export function isDeluxePresetActive(selections, preset) {
  if (!preset || !preset.modifiers) return false;
  return preset.modifiers.every((m) => {
    const sel = selections[m.group];
    if (Array.isArray(sel)) return sel.some((s) => s.id === m.id);
    return sel?.id === m.id;
  });
}

// Returns a new `selections` object with the preset toppings turned on or off.
// Non-preset selections the customer already made are preserved.
export function applyDeluxePreset(selections, preset, active) {
  if (!preset || !preset.modifiers) return selections;
  const next = { ...selections };
  for (const m of preset.modifiers) {
    const group = m.group;
    const current = next[group];
    if (Array.isArray(current)) {
      if (active) {
        if (!current.some((s) => s.id === m.id)) next[group] = [...current, { id: m.id, name: m.name, price: m.price }];
      } else {
        next[group] = current.filter((s) => s.id !== m.id);
      }
    } else {
      if (active) {
        next[group] = { id: m.id, name: m.name, price: m.price };
      } else if (current?.id === m.id && group !== 'Size') {
        next[group] = null;
      }
    }
  }
  return next;
}