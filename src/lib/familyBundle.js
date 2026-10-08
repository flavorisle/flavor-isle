// The School Night Lifesaver — client-side bundle helpers.
//
// One place decides which options a slot may offer, what a slot starts with,
// how a slot's choices flatten into a normal cart line, and how much of a
// bundle line is already covered by the fixed bundle price. The cart, the card,
// and the checkout all read the same numbers, and base44/shared/familyBundle.ts
// recomputes them from the catalog on the server.

import { FAMILY_BUNDLE, FAMILY_BUNDLE_ENABLED } from '@/config/familyBundle';
import { applyModifierOverrides } from '@/lib/modifierOverrides';
import { flattenModifierWithNested, nestedSelectionsExtra } from '@/components/NestedModifierLists';

export const isFamilyBundleEnabled = () => FAMILY_BUNDLE_ENABLED === true;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// A group matches a rule either by its Square modifier-list id or, for the
// synthetic size group (no id in the catalog), by 'name:<group name>'.
const groupKeys = (group) => [group?.id, `name:${group?.name}`].filter(Boolean);

// Which options of this group may be offered inside the bundle.
export function allowedOptionIdsForGroup(group, rules = {}) {
  if ((rules.hiddenGroupIds || []).includes(group?.id)) return [];
  for (const key of groupKeys(group)) {
    if (rules.groupOptionAllow && rules.groupOptionAllow[key]) return rules.groupOptionAllow[key];
  }
  return null; // no restriction — every live option stays offered
}

// The item's live modifier groups, admin overrides applied, trimmed to what the
// bundle offers for this slot.
export function groupsForSlot(slot, item, modifierOverrides) {
  const rules = FAMILY_BUNDLE[slot.kind === 'burger' ? 'burger' : slot.kind === 'mini' ? 'mini' : slot.kind === 'drink' ? 'drinks' : slot.kind === 'side' ? 'sides' : 'cake'] || {};
  return applyModifierOverrides(item?.modifiers, modifierOverrides)
    .map((group) => {
      const allowed = allowedOptionIdsForGroup(group, rules);
      if (allowed === null) return group;
      return { ...group, modifiers: (group.modifiers || []).filter((m) => allowed.includes(m.id)) };
    })
    .filter((group) => (group.modifiers || []).length > 0);
}

// The rule object for a kind (sides and drinks carry their own rules).
export function rulesForSlot(slot) {
  if (slot.kind === 'side') return FAMILY_BUNDLE.sides;
  if (slot.kind === 'drink') return FAMILY_BUNDLE.drinks;
  return {};
}

// What a slot starts with: the approved defaults only. Cheeseburgers start with
// Lettuce + Tomato at Regular, sides with Regular seasoning, drinks with the
// locked 14 oz size. Everything else stays exactly as the live flow leaves it —
// unselected until the customer picks.
export function presetForSlot(slot) {
  if (slot.kind === 'burger') {
    return {
      selectionIds: FAMILY_BUNDLE.cheeseburgerDefaults.optionIds,
      nested: FAMILY_BUNDLE.cheeseburgerDefaults.nested,
    };
  }
  const rules = rulesForSlot(slot);
  return { selectionIds: rules.presetOptionIds || [] };
}

// Build a slot's initial selections from the preset, then flatten them into the
// same modifier shape the live modifier flow produces for the cart.
export function buildSlotState(slot, item, modifierOverrides) {
  const groups = groupsForSlot(slot, item, modifierOverrides);
  const preset = presetForSlot(slot);
  const presetIds = new Set(preset.selectionIds || []);
  const selections = {};
  const nestedSelections = {};

  for (const group of groups) {
    const presetOptions = (group.modifiers || []).filter((m) => presetIds.has(m.id) && !m.sold_out);
    if (presetOptions.length > 0) {
      selections[group.name] = group.selection_type === 'MULTIPLE' ? presetOptions : presetOptions[0];
    } else {
      selections[group.name] = group.selection_type === 'MULTIPLE'
        ? []
        : (group.name === 'Size' ? (group.modifiers.find((m) => !m.sold_out) || group.modifiers[0]) : null);
    }
  }

  for (const group of groups) {
    for (const mod of group.modifiers || []) {
      const wanted = preset.nested?.[mod.id];
      if (!wanted) continue;
      const picked = {};
      for (const [listName, optionId] of Object.entries(wanted)) {
        const list = (mod.child_modifier_lists || []).find((l) => l.name === listName);
        const option = list?.modifiers?.find((o) => o.id === optionId && !o.sold_out);
        if (option) picked[listName] = option;
      }
      if (Object.keys(picked).length > 0) nestedSelections[mod.id] = picked;
    }
  }

  return flattenSlotSelections(groups, selections, nestedSelections);
}

// Flatten a slot's selections into cart-ready modifiers + their extra cost,
// mirroring the live modifier flow (including silent nested rows).
export function flattenSlotSelections(groups, selections, nestedSelections) {
  const selectedModifiers = [];
  let extraCost = 0;
  for (const group of groups || []) {
    const sel = selections?.[group.name];
    if (!sel) continue;
    const list = Array.isArray(sel) ? sel : [sel];
    for (const mod of list) {
      selectedModifiers.push(...flattenModifierWithNested(mod, group.name, nestedSelections?.[mod.id]));
      // Same arithmetic the live modifier flow shows and charges: the option's
      // own price plus everything hanging off its nested child lists.
      extraCost += Number(mod.price) || 0;
      extraCost += nestedSelectionsExtra(nestedSelections?.[mod.id]);
    }
  }
  return {
    selectedModifiers,
    extraCost: round2(extraCost),
    summary: summarizeModifiers(selectedModifiers),
  };
}

// Short, human summary of a slot's build for the card (skips silent Lite/
// Regular/Extra rows, which carry no customer-visible meaning on their own).
export function summarizeModifiers(selectedModifiers) {
  const names = (selectedModifiers || []).filter((m) => m?.name && !m.silent).map((m) => m.name);
  if (names.length === 0) return 'No selections yet';
  return names.slice(0, 4).join(', ') + (names.length > 4 ? ` +${names.length - 4} more` : '');
}

// The part of a line's price the bundle price already covers: its price minus
// any paid extras. Included allowances are the regular Lettuce / Tomato / 14 oz.
export function includedUnitPrice(line) {
  const extras = (line?.selectedModifiers || []).reduce((sum, m) => {
    if (!m) return sum;
    if (FAMILY_BUNDLE.includedOptionIds.includes(m.id)) return sum;
    return sum + (Number(m.price) || 0);
  }, 0);
  return round2((Number(line?.price) || 0) - extras);
}

export function isBundleLine(line) {
  return line?.bundleId === FAMILY_BUNDLE.id;
}

// How much comes off the cart for the bundle lines it contains. Lines added
// together share a bundleGroup; each group pays the bundle price once.
export function getFamilyBundleDiscount(cartItems) {
  const groups = {};
  for (const line of cartItems || []) {
    if (!isBundleLine(line)) continue;
    const key = line.bundleGroup || FAMILY_BUNDLE.id;
    groups[key] = (groups[key] || 0) + includedUnitPrice(line) * (Number(line.quantity) || 1);
  }
  const discount = Object.values(groups).reduce((sum, included) => sum + Math.max(0, included - FAMILY_BUNDLE.price), 0);
  return round2(discount);
}

// How much of a slot's selection is paid extras (charged on top of $37.74).
export function extrasTotalForBundle(cartItems) {
  return round2((cartItems || [])
    .filter(isBundleLine)
    .reduce((sum, line) => sum + (Number(line.price) || 0) * (Number(line.quantity) || 1) - includedUnitPrice(line) * (Number(line.quantity) || 1), 0));
}