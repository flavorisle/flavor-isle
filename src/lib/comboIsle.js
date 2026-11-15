import { base44 } from '@/api/base44Client';
import { itemCategoryKey } from '@/lib/menuCategory';

// Combo Isle — the box.
//
// Wesley, Nov 15 2026: a combo is a main + a side + a drink picked from the live
// Square menu, boxes are made ONLY here, every finished box is numbered, a box
// missing an item dissolves into ordinary singles at full Square price, and a box
// never takes Happy Hour. The 9% lives in COMBO_DISCOUNT_PERCENT and is never
// advertised: the customer sees one box price, the kitchen sees no discount.
//
// Which items are mains, sides and drinks is an admin setting (/admin/combo-isle):
// Square categories, a per-item quantity (two minis make a main), hidden items,
// and an optional large milkshake in place of the large drink.

export const COMBO_DISCOUNT_PERCENT = 9;
export const COMBO_ROLES = ['main', 'side', 'drink'];
export const boxLabel = (n) => `Box ${n}`;

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Used when the admin record has not been saved yet, so the page is never blank.
export const DEFAULT_COMBO_SETTING = {
  is_active: true,
  main_categories: ['Old-Fashioned Burgers', 'Handheld Classics', 'Crisp & Cluck', 'Grilled & Gooey', 'Frankly Delicious', 'Golden Crisp & Savory', 'Seasonal & Supreme'],
  side_categories: ['Crunch & Munch', 'Snack & Munch'],
  drink_categories: ['Flow & Fizz'],
  shake_categories: ['Whirl & Twirl'],
  allow_shake_substitution: true,
  hidden_item_ids: [],
  item_quantities: [],
};

const norm = (s) => String(s || '').trim().toLowerCase();

// An item can carry a custom display_category (admin renames), so match on every
// category key it exposes rather than the display key alone.
const keysOf = (item) =>
  [itemCategoryKey(item), item.display_category, item.square_category, item.category]
    .filter(Boolean)
    .map(norm);

const inAnyCategory = (item, list) => {
  const keys = keysOf(item);
  return (list || []).some((c) => keys.includes(norm(c)));
};

export const byPriceThenName = (a, b) =>
  (a.price || 0) - (b.price || 0) || String(a.name).localeCompare(String(b.name));

// The saved admin record, or the defaults when it does not exist yet.
export async function loadComboSetting() {
  try {
    const rows = await base44.entities.ComboIsleSetting.list('-updated_date', 5);
    const saved = (rows || []).find((r) => r && r.is_active !== false) || (rows || [])[0];
    return { ...DEFAULT_COMBO_SETTING, ...(saved || {}) };
  } catch (e) {
    return { ...DEFAULT_COMBO_SETTING };
  }
}

// How many of this item make one box. Minis are normally 2 because a mini is not
// a meal; everything else is 1 unless the admin says otherwise.
export function requiredQuantity(setting, item) {
  const rows = (setting?.item_quantities || []).filter(Boolean);
  const byId = rows.find((r) => r.menu_item_id && r.menu_item_id === item?.id);
  if (byId) return Math.max(1, Math.floor(Number(byId.quantity) || 1));
  const byName = rows.find((r) => r.name && norm(r.name) === norm(item?.name));
  if (byName) return Math.max(1, Math.floor(Number(byName.quantity) || 1));
  return 1;
}

// The pickable options for one column. Catalog-backed items only — every line is
// repriced from Square on the server, so a row without a square_item_id can never
// be part of a box.
export function itemsForRole(items, setting, role) {
  const categories = role === 'main'
    ? setting?.main_categories
    : role === 'side'
      ? setting?.side_categories
      : setting?.drink_categories;
  const hidden = new Set((setting?.hidden_item_ids || []).filter(Boolean));
  return (items || [])
    .filter((i) => i && i.square_item_id && !hidden.has(i.id))
    .filter((i) => inAnyCategory(i, categories))
    .sort(byPriceThenName);
}

// The shakes offered when a large milkshake stands in for the large drink.
export function shakesForSubstitution(items, setting) {
  if (!setting?.allow_shake_substitution) return [];
  const hidden = new Set((setting?.hidden_item_ids || []).filter(Boolean));
  return (items || [])
    .filter((i) => i && i.square_item_id && !hidden.has(i.id))
    .filter((i) => inAnyCategory(i, setting?.shake_categories))
    .sort(byPriceThenName);
}

// The whole box total for a set of picked components (Square prices + modifiers).
export const boxTotal = (components) =>
  round2((components || []).filter(Boolean).reduce((s, c) => s + (Number(c?.price) || 0) * (Number(c?.quantity) || 1), 0));

export const boxCharge = (fullTotal) => round2((Number(fullTotal) || 0) * (1 - COMBO_DISCOUNT_PERCENT / 100));

// Split the box's charged total across its lines as unit prices, so the cart's
// visible prices add up to exactly the box price. The last line absorbs the
// rounding remainder.
export function allocateBoxUnitCharges(components) {
  const lines = (components || []).filter(Boolean).map((c) => {
    const qty = Math.max(1, Math.floor(Number(c.quantity) || 1));
    return { qty, total: round2((Number(c.price) || 0) * qty) };
  });
  const full = round2(lines.reduce((s, l) => s + l.total, 0));
  const charge = boxCharge(full);
  const units = [];
  let remainder = charge;
  lines.forEach((line, i) => {
    if (i === lines.length - 1) {
      units.push(round2(remainder / line.qty));
      return;
    }
    const lineCharge = full > 0 ? round2(charge * (line.total / full)) : 0;
    const unit = round2(lineCharge / line.qty);
    units.push(unit);
    remainder = round2(remainder - round2(unit * line.qty));
  });
  return units;
}

// Which boxes in the cart are whole. A group is a box only when it still holds a
// main, a side and a drink; anything less is singles (Wesley, 8:03 AM).
export function comboGroupStatus(cartItems) {
  const groups = new Map();
  (cartItems || []).forEach((line) => {
    if (!line?.comboGroup) return;
    const group = groups.get(line.comboGroup) || {};
    group[line.comboRole] = line;
    groups.set(line.comboGroup, group);
  });
  const complete = new Set();
  const broken = new Set();
  groups.forEach((group, id) => {
    if (COMBO_ROLES.every((role) => group[role])) complete.add(id);
    else broken.add(id);
  });
  return { groups, complete, broken };
}

// Next box number for this cart: one past the highest box already in it, so a box
// that breaks never renumbers the boxes behind it.
export function nextBoxNumber(cartItems) {
  const used = (cartItems || [])
    .map((i) => Number(i?.comboBox) || 0)
    .filter((n) => n > 0);
  return used.length ? Math.max(...used) + 1 : 1;
}

// A broken box's lines go back to being ordinary singles at their full Square
// price, with no box number and nothing for the kitchen to read as a box.
export function dissolveLine(line) {
  if (!line) return line;
  const full = Number(line.comboFullPrice);
  const next = { ...line };
  if (Number.isFinite(full) && full > 0) next.price = round2(full);
  delete next.comboGroup;
  delete next.comboRole;
  delete next.comboBox;
  delete next.comboFullPrice;
  delete next.bundleName;
  return next;
}
