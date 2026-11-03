// A one-to-one display tree: no name matching, text deduplication, or local recipe edits.
export function modifierGroups(groups = [], prefix = '') {
  return groups.map((group, index) => ({
    ...group,
    key: `${prefix}/${index}:${group.id}`,
    modifiers: (group.modifiers || []).map((option, optionIndex) => ({
      ...option,
      key: `${prefix}/${index}:${group.id}/${optionIndex}:${option.id}`,
      child_modifier_lists: modifierGroups(option.child_modifier_lists || [], `${prefix}/${index}:${group.id}/${optionIndex}:${option.id}`),
    })),
  }));
}

export function countCardModifiers(groups = []) {
  return groups.reduce((total, group) => total + group.modifiers.reduce((sum, option) =>
    sum + 1 + countCardModifiers(option.child_modifier_lists), 0), 0);
}

export function squareMoney(money) {
  if (!money || money.amount == null || !money.currency) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: money.currency })
    .format(Number(money.amount) / 100);
}