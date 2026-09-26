import { base44 } from '@/api/base44Client';
import { itemCategoryKey } from '@/lib/menuCategory';

// ComboConfig-driven combos.
//
// A combo is a main + a side + a drink picked from the ComboConfig's three
// categories, with its discount_percent applied to the whole combo. Only
// catalog-backed MenuItems (ones carrying a square_item_id) are offered as
// components, because verifyOrderPricing reprices every component from the
// authoritative MenuItem records and the discount from the ComboConfig record —
// the client's prices are never trusted.
//
// A combo whose side or drink category resolves to nothing is never rendered:
// resolveCombos moves it to `skipped` with the reason so callers hide it.

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const norm = (s) => (s || '').toString().trim().toLowerCase();

const matchesCategory = (item, category) => norm(itemCategoryKey(item)) === norm(category);

// Load the active combos already resolved against the live menu.
export async function loadComboData() {
  const [combos, items] = await Promise.all([
    base44.entities.ComboConfig.filter({ is_active: true }).catch(() => []),
    base44.entities.MenuItem.filter({ is_available: true, is_hidden: false }).catch(() => []),
  ]);
  return resolveCombos(combos || [], items || []);
}

// Split active combos into usable (every slot populated with catalog-backed
// items) and skipped (with the missing slots listed).
export function resolveCombos(combos, items) {
  const usable = [];
  const skipped = [];
  for (const combo of combos || []) {
    if (!combo || combo.is_active === false) continue;
    const catalogItems = (items || []).filter((i) => i.square_item_id);
    const main = catalogItems.filter((i) => matchesCategory(i, combo.main_category));
    const side = catalogItems.filter((i) => matchesCategory(i, combo.side_category));
    const drink = catalogItems.filter((i) => matchesCategory(i, combo.drink_category));
    const missing = [];
    if (main.length === 0) missing.push(`main "${combo.main_category}"`);
    if (side.length === 0) missing.push(`side "${combo.side_category}"`);
    if (drink.length === 0) missing.push(`drink "${combo.drink_category}"`);
    if (missing.length > 0) skipped.push({ combo, missing });
    else usable.push({ ...combo, main, side, drink });
  }
  return { usable, skipped };
}

// The usable combo whose main slot contains this product-page item.
export function comboForItem(usable, item) {
  if (!item || !item.square_item_id) return null;
  return (usable || []).find((c) => c.main.some((i) => i.id === item.id)) || null;
}

// One component's authoritative-equivalent total: the item's catalog price plus
// the catalog prices of its selected options.
export const componentTotal = (basePrice, selectedModifiers) =>
  round2((Number(basePrice) || 0) + (selectedModifiers || []).reduce((s, m) => s + (Number(m?.price) || 0), 0));

// Combo price = (main + side + drink) × (1 − discount_percent/100), rounded the
// same way the server does so the two agree to the cent.
export function comboPricing(combo, components) {
  const original = round2((components || []).filter(Boolean).reduce((s, c) => s + (Number(c.total) || 0), 0));
  const pct = Number(combo?.discount_percent) || 0;
  const price = round2(original * (1 - pct / 100));
  return { original, price, savings: round2(original - price), percent: pct };
}