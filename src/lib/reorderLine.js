import { applyModifierOverrides, getModifierOverrides } from '@/lib/modifierOverrides';
import { flattenModifierWithNested } from '@/components/NestedModifierLists';
import { restorePanelSelection } from '@/lib/restorePanelSelection';
import { withShakeFlavorLevel } from '@/components/ShakeFlavorControl';

// Turns one past order line back into something orderable today.
//
// The customer's own choices are recovered from the order (selectedModifiers),
// matched to the current Square catalog, and repriced from today's prices — so a
// reorder never carries an old receipt's price and never adds an option the menu
// no longer offers. Lite/Extra levels and follow-up picks (ice, flavor) come
// back with the option they belong to, exactly as they were ordered.

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function buildReorderLine(item, storedLine, menuSetting) {
  const groups = applyModifierOverrides(item?.modifiers, getModifierOverrides(menuSetting));
  const { selections, nested } = restorePanelSelection(groups, {
    selectedModifiers: storedLine?.selectedModifiers || [],
  });

  // Built in the item's own group order, the same way the menu's add-to-bag
  // path builds it, so the bag lists a reorder just like a fresh order.
  const selectedModifiers = [];
  for (const group of groups) {
    const chosen = selections[group.name];
    if (!chosen) continue;
    for (const mod of Array.isArray(chosen) ? chosen : [chosen]) {
      selectedModifiers.push(...flattenModifierWithNested(mod, group.name, nested[mod.id]));
    }
  }

  const extraCost = selectedModifiers.reduce((sum, m) => sum + (Number(m?.price) || 0), 0);
  return {
    selectedModifiers,
    // What the bag will list for this line (Square's silent rows excluded).
    lines: selectedModifiers.filter((m) => m.name && !m.silent),
    price: round2((Number(item?.price) || 0) + extraCost),
    quantity: Math.min(20, Math.max(1, Number(storedLine?.quantity) || 1)),
  };
}

// The cart lines for one-tap reordering: the item as it stands on the menu
// today, carrying the customer's previous build. Returned as an array because
// the cart adds one line per call — a past quantity of two lands as two, the
// same way the menu's own add button behaves.
export function reorderCartItems(item, storedLine, menuSetting) {
  const { selectedModifiers, price, quantity } = buildReorderLine(item, storedLine, menuSetting);
  const flavorLevel = storedLine?.flavorLevel || undefined;
  const line = {
    ...item,
    name: withShakeFlavorLevel(item.name, flavorLevel),
    flavorLevel,
    price,
    selectedModifiers,
    deluxeLabel: storedLine?.deluxeLabel || undefined,
    deluxeToppings: storedLine?.deluxeToppings || [],
    allergyNote: storedLine?.allergyNote || undefined,
  };
  return Array.from({ length: quantity }, () => line);
}