// Deluxe preset configuration.
//
// A "Deluxe" preset is a one-tap shortcut in the modifier modal that selects a
// fixed set of toppings (e.g. mustard, pickles, onions, tomatoes, lettuce) and
// labels the order "Deluxe" — or "Deluxe, no <topping>" as the customer removes
// individual toppings.
//
// Storage: this config is kept in localStorage so it works on the current
// frontend branch. The read/write surface below is the single place that
// touches storage, so it can be swapped for a server-side entity field later
// without touching any component code.

const STORAGE_KEY = 'flavor_isle_deluxe_config';

// The out-of-the-box preset — matches the original "Deluxe" burger build.
export const DEFAULT_DELUXE_CONFIG = {
  name: 'Deluxe',
  toppings: ['Mustard', 'Mayo', 'Pickles', 'Onions', 'Tomatoes', 'Lettuce'],
  // Menu item ids the preset applies to. Empty array = every item that has
  // matching modifiers available.
  appliesTo: [],
};

const norm = (s) => (s || '').trim().toLowerCase();

// Read the current config, merged over the defaults so new fields always exist.
export function getDeluxeConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DELUXE_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : DEFAULT_DELUXE_CONFIG.name,
      toppings: Array.isArray(parsed.toppings) ? parsed.toppings.filter(Boolean) : DEFAULT_DELUXE_CONFIG.toppings,
      appliesTo: Array.isArray(parsed.appliesTo) ? parsed.appliesTo : DEFAULT_DELUXE_CONFIG.appliesTo,
    };
  } catch {
    return DEFAULT_DELUXE_CONFIG;
  }
}

export function saveDeluxeConfig(config) {
  const clean = {
    name: (config?.name || '').trim() || DEFAULT_DELUXE_CONFIG.name,
    toppings: (config?.toppings || []).filter(Boolean),
    appliesTo: Array.isArray(config?.appliesTo) ? config.appliesTo : [],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  return clean;
}

// Resolves the Deluxe preset for a specific menu item.
//
// Returns { name, modifiers } where `modifiers` is the array of concrete
// modifier entries (with group + id + name + price) found on the item that
// match the configured topping names — or null when the preset doesn't apply
// to this item or the item has none of the toppings available.
export function getDeluxePresetForItem(item) {
  if (!item || !Array.isArray(item.modifiers) || item.modifiers.length === 0) return null;

  const config = getDeluxeConfig();

  // Restrict to specific items when the admin chose an explicit list.
  if (config.appliesTo.length > 0 && !config.appliesTo.includes(item.id)) return null;

  const wanted = config.toppings.map(norm);
  const matched = [];

  for (const group of item.modifiers) {
    if (!group || !Array.isArray(group.modifiers)) continue;
    for (const mod of group.modifiers) {
      if (!mod || mod.sold_out) continue;
      if (wanted.includes(norm(mod.name))) {
        matched.push({ group: group.name, id: mod.id, name: mod.name, price: mod.price || 0 });
      }
    }
  }

  if (matched.length === 0) return null;
  return { name: config.name, modifiers: matched };
}

// True when every preset modifier is currently selected — used to show the
// active/checked state on the "Make it Deluxe" button.
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
      // SINGLE-select group (rare for toppings) — set or clear.
      if (active) {
        next[group] = { id: m.id, name: m.name, price: m.price };
      } else if (current?.id === m.id && group !== 'Size') {
        next[group] = null;
      }
    }
  }
  return next;
}