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
// The configuration is an admin setting stored on the MenuSetting record
// (`deluxe: { enabled, presets }`) so it applies to every visitor, not just the
// admin's browser. It's hydrated into a module-level cache once the setting
// loads (see CartContext) so the many synchronous callers below stay simple.

import { matchScore } from '@/lib/deluxeLabel';

// Flavor Isle's Deluxe: pickles, onions, tomatoes, and lettuce, plus exactly ONE
// condiment — mustard or mayo, never both. The condiment is an admin setting
// (`condiment` on the stored deluxe config, default mayo) so Pulse can flip the
// whole site to mustard without touching code. See normalizeDeluxeConfig.
export const DELUXE_BASE_TOPPINGS = ['Pickle', 'Onion', 'Tomato', 'Lettuce'];
export const DEFAULT_DELUXE_CONDIMENT = 'mayo';
export const DELUXE_CONDIMENT_OPTIONS = [
  { key: 'mayo', label: 'Mayo' },
  { key: 'mustard', label: 'Mustard' },
];
const CONDIMENT_LABEL = { mayo: 'Mayo', mustard: 'Mustard' };

export const condimentLabel = (key) => CONDIMENT_LABEL[key] || CONDIMENT_LABEL[DEFAULT_DELUXE_CONDIMENT];

// Built-in preset used out of the box and whenever the admin hasn't configured
// any presets yet, so the Deluxe button keeps working before setup.
export const DEFAULT_DELUXE_PRESETS = [
  {
    id: 'deluxe',
    name: 'Deluxe',
    toppings: [...DELUXE_BASE_TOPPINGS, condimentLabel(DEFAULT_DELUXE_CONDIMENT)],
    silentToppings: [],
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

export function cleanPreset(p) {
  return {
    id: (p && p.id) || genId(),
    name: (p && p.name && p.name.trim()) || 'Deluxe',
    toppings: Array.isArray(p && p.toppings) ? p.toppings.filter(Boolean) : [],
    silentToppings: Array.isArray(p && p.silentToppings) ? p.silentToppings.filter(Boolean) : [],
    appliesTo: Array.isArray(p && p.appliesTo) ? p.appliesTo : [],
  };
}

// A Deluxe preset must carry exactly ONE condiment. Whatever a stored topping
// list says, every condiment is stripped and a single one is appended, so a
// preset can never select mustard and mayo together.
//
// The condiment lives in the preset's own topping list — storage the deluxe
// config already has — so Pulse's condiment choice is a plain server-side
// setting with no extra field to migrate.
const isCondiment = (name) => /^(mayo|mayonnaise|mustard|honey mustard)$/i.test((name || '').trim());

// Rewrite every preset so its only condiment is `condiment` (mayo by default).
export function applyCondimentToPresets(presets, condiment) {
  const chosen = DELUXE_CONDIMENT_OPTIONS.some((o) => o.key === condiment)
    ? condiment
    : DEFAULT_DELUXE_CONDIMENT;
  return (presets || []).map((p) => ({
    ...p,
    toppings: [...(p.toppings || []).filter((t) => !isCondiment(t)), condimentLabel(chosen)],
  }));
}

// The condiment the stored presets currently use — mustard only when a preset
// actually carries mustard and no mayo.
export function condimentFromPresets(presets) {
  const names = (presets || []).flatMap((p) => p.toppings || []).map((t) => (t || '').toLowerCase());
  const hasMayo = names.some((t) => /^mayo/.test(t));
  const hasMustard = names.some((t) => /mustard/.test(t));
  if (hasMustard && !hasMayo) return 'mustard';
  return DEFAULT_DELUXE_CONDIMENT;
}

// Normalize a stored deluxe config into { enabled, condiment, presets }. An
// empty preset list falls back to the built-in Deluxe preset rather than hiding
// the button.
export function normalizeDeluxeConfig(cfg) {
  const raw = cfg || {};
  const presets = Array.isArray(raw.presets) && raw.presets.length > 0
    ? raw.presets.map(cleanPreset)
    : DEFAULT_DELUXE_PRESETS.map(cleanPreset);
  const condiment = condimentFromPresets(presets);
  return {
    enabled: raw.enabled === true,
    condiment,
    presets: applyCondimentToPresets(presets, condiment),
  };
}

// In-memory cache hydrated from the MenuSetting record. It starts OFF: the
// stored setting must explicitly enable the feature, so a failed or delayed
// settings load can never make a "Make it Deluxe" button appear.
let _config = normalizeDeluxeConfig(null);

export function hydrateDeluxeConfig(cfg) {
  _config = normalizeDeluxeConfig(cfg);
  return _config;
}

// Master switch — when false the "Make it Deluxe" button is hidden everywhere.
export function isDeluxeEnabled() {
  return _config.enabled;
}

// The active condiment ('mayo' | 'mustard') for the Deluxe preset.
export function getDeluxeCondiment() {
  return _config.condiment;
}

export function getDeluxePresets() {
  return _config.presets;
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
  if (!isDeluxeEnabled()) return [];
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
        // Remove Plain/No Sauce when adding preset toppings
        const filtered = current.filter((s) => !/plain/i.test(s.name) && !/no\s*sauce/i.test(s.name));
        if (!filtered.some((s) => s.id === m.id)) filtered.push({ id: m.id, name: m.name, price: m.price });
        next[group] = filtered;
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