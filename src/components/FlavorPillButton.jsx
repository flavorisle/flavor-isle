import React from 'react';
import ModifierTile from '@/components/ModifierTile';
import { getModifierPhoto } from '@/lib/modifierPhotos';
import { levelChildList, levelFromNested, nestedForLevel, supportsLevels } from '@/lib/modifierLevels';

// Issue #324 — flavors are tiles now, exactly like toppings and sauces. The
// tile's Lite / Reg / Ex strip writes the same nested selection the old pill
// wrote, so the cart, the price and the kitchen ticket are unchanged. Flavors
// ship with no photo (a finished milkshake is not a flavor), so each one shows
// its first letter until a real syrup shot is added in Admin → Modifier photos.

export const FLAVOR_AMOUNT_LIST = 'Flavor Amount';

export function isFlavorGroup(group) {
  const name = group?.name || '';
  // A cake flavor is a cake choice (vanilla or chocolate), not an amount.
  // Lite cake and extra cake are not a thing, so those groups stay plain options.
  if (/cake/i.test(name)) return false;
  return /flavor/i.test(name);
}

// Fallback shape used only when a flavor carries NO child list: an id-less
// placeholder so the level can still ride as a name prefix, never sent to
// Square as a modifier of its own.
export function flavorAmountNested(level) {
  if (!level) return {};
  return { [FLAVOR_AMOUNT_LIST]: { name: level === 'lite' ? 'Lite' : 'Extra', price: 0 } };
}

// The child list that carries a flavor's amount, when it has one.
export function flavorChildList(mod) {
  return levelChildList(mod);
}

// Records the real nested amount option (its catalog id AND price) for a
// Lite/Extra level. Falls back to the id-less Flavor Amount row only when the
// flavor has no such list at all.
export function flavorNestedForLevel(mod, level) {
  return nestedForLevel(mod, level);
}

// Reads the level from ANY nested list — the real "- / + Flavors" list or the
// synthetic Flavor Amount row.
export function getFlavorLevel(nestedSelection) {
  return levelFromNested(nestedSelection);
}

// Total of any nested option prices; the flavor's own price is added by the tile.
export function getFlavorNestedPrice(nestedSelection) {
  if (!nestedSelection) return 0;
  return Object.values(nestedSelection).reduce((sum, entry) => sum + (Number(entry?.price) || 0), 0);
}

export default function FlavorPillButton({
  mod,
  isSelected,
  onToggle,
  nestedSelection,
  onNestedChange,
  levels,
}) {
  if (!mod) return null;

  const level = getFlavorLevel(nestedSelection);
  const photo = getModifierPhoto(mod.name);

  const select = (next) => {
    if (next == null) {
      // Clearing the flavor drops its Lite/Extra level with it.
      if (isSelected) {
        onToggle?.();
        onNestedChange?.({});
      }
      return;
    }
    if (!isSelected) onToggle?.();
    onNestedChange?.(nestedForLevel(mod, next));
  };

  return (
    <ModifierTile
      name={mod.name}
      price={mod.price}
      photo={photo}
      state={isSelected ? (level || 'reg') : null}
      levels={levels ?? supportsLevels(mod)}
      onSelect={select}
    />
  );
}