// Combo Isle — the box builder's client rules, mirrored on the server by
// base44/shared/comboIsle.ts. A box is a main + a side + a drink sharing one
// comboGroup, and the box is charged at COMBO_DISCOUNT_PERCENT off the sum of
// its singles. A group missing any of the three roles is not a box, so its
// lines price as ordinary singles (dissolveLine).

import { base44 } from '@/api/base44Client';

export const COMBO_DISCOUNT_PERCENT = 9;

export const COMBO_ROLES = ['main', 'side', 'drink'];

export const round2 = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;

// Which setting list feeds each role.
const ROLE_CATEGORY_KEY = {
  main: 'main_categories',
  side: 'side_categories',
  drink: 'drink_categories',
};

// Used until the admin page saves a ComboIsleSetting record. Empty category
// lists mean nothing is offered yet — the admin picks the categories.
export const DEFAULT_COMBO_SETTING = {
  is_active: true,
  main_categories: [],
  side_categories: [],
  drink_categories: [],
  shake_categories: [],
  allow_shake_substitution: false,
  hidden_item_ids: [],
  item_quantities: [],
};

let cachedSetting = null;

export async function loadComboSetting() {
  if (cachedSetting) return cachedSetting;
  try {
    const rows = await base44.entities.ComboIsleSetting.list('-created_date', 1);
    const row = (Array.isArray(rows) ? rows[0] : rows?.items?.[0]) || null;
    cachedSetting = { ...DEFAULT_COMBO_SETTING, ...(row || {}) };
  } catch {
    cachedSetting = DEFAULT_COMBO_SETTING;
  }
  return cachedSetting;
}

// Boxes read "Box 1", "Box 2"… and their group id carries the number.
export function boxLabel(group) {
  const n = Number(String(group ?? '').replace(/[^0-9]/g, ''));
  return n > 0 ? `Box ${n}` : 'Combo box';
}

// How many of this item one box needs — the admin page can say a two-piece
// order counts as one main. Everything else is one.
export function requiredQuantity(itemId, setting) {
  const entry = (setting?.item_quantities || []).find(q => q && q.menu_item_id === itemId);
  const n = Number(entry?.quantity);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 1;
}

// The items a role may pick from, minus anything the admin hid.
export function itemsForRole(items, role, setting) {
  const key = ROLE_CATEGORY_KEY[role];
  if (!key) return [];
  const categories = setting?.[key] || [];
  if (!categories.length) return [];
  const hidden = new Set(setting?.hidden_item_ids || []);
  return (items || []).filter(item =>
    item && categories.includes(item.category) && !hidden.has(item.id) && !hidden.has(item.square_item_id)
  );
}

// Shake substitution: a drink slot may take a shake when the admin allows it.
export function shakesForSubstitution(items, setting) {
  if (!setting?.allow_shake_substitution) return [];
  const categories = setting?.shake_categories || [];
  if (!categories.length) return [];
  const hidden = new Set(setting?.hidden_item_ids || []);
  return (items || []).filter(item =>
    item && categories.includes(item.category) && !hidden.has(item.id) && !hidden.has(item.square_item_id)
  );
}

const lineFullPrice = (line) => Number(line?.fullUnitPrice ?? line?.price) || 0;
const lineQty = (line) => Number(line?.quantity) || 1;

// The box at its single prices.
export function boxTotal(lines) {
  return round2((lines || []).reduce((sum, line) => sum + lineFullPrice(line) * lineQty(line), 0));
}

// The box at the Combo Isle price (9% off the total above).
export function boxCharge(lines) {
  return round2(boxTotal(lines) * (1 - COMBO_DISCOUNT_PERCENT / 100));
}

// The box charge split across its lines, one unit charge per line, in the same
// order as the lines passed in. The dearest line absorbs the sub-cent
// remainder so the units add back up to boxCharge.
export function allocateBoxUnitCharges(lines) {
  const list = lines || [];
  if (!list.length) return [];
  const total = boxTotal(list);
  const charge = boxCharge(list);
  if (!total) return list.map(() => 0);
  const charges = list.map(line => round2((charge * lineFullPrice(line) * lineQty(line)) / total / lineQty(line)));
  const allocated = round2(list.reduce((sum, line, i) => sum + charges[i] * lineQty(line), 0));
  const remainder = round2(charge - allocated);
  if (remainder !== 0) {
    let dearest = 0;
    list.forEach((line, i) => {
      if (lineFullPrice(line) * lineQty(line) > lineFullPrice(list[dearest]) * lineQty(list[dearest])) dearest = i;
    });
    charges[dearest] = round2(charges[dearest] + remainder / lineQty(list[dearest]));
  }
  return charges;
}

// Which boxes in the cart have all three roles. Anything else is broken: it
// has lines but is missing a role, so it is not a box and prices as singles.
export function comboGroupStatus(cartItems) {
  const roles = new Map();
  for (const line of cartItems || []) {
    const group = line?.comboGroup;
    if (!group) continue;
    const list = roles.get(group) || [];
    if (COMBO_ROLES.includes(line?.comboRole)) list.push(line.comboRole);
    roles.set(group, list);
  }
  const complete = new Set();
  const broken = new Set();
  roles.forEach((list, group) => {
    if (list.length === COMBO_ROLES.length && new Set(list).size === COMBO_ROLES.length) complete.add(group);
    else broken.add(group);
  });
  return { complete, broken };
}

// The lowest box number not already in the cart.
export function nextBoxNumber(cartItems) {
  const used = new Set();
  for (const line of cartItems || []) {
    const n = Number(String(line?.comboGroup || '').replace(/[^0-9]/g, ''));
    if (n > 0) used.add(n);
  }
  let n = 1;
  while (used.has(n)) n += 1;
  return n;
}

// Strip a line's box membership and put it back on its full single price.
export function dissolveLine(line) {
  if (!line) return line;
  const { comboGroup, comboRole, comboBoxNumber, fullUnitPrice, ...rest } = line;
  return { ...rest, price: Number(fullUnitPrice ?? line.price) || 0 };
}