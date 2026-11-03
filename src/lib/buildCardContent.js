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

// Base and thickness are the same on every Bliss, so they print once in the page
// footer instead of on every card. Both are real Square groups, named by Square.
export const isFooterGroup = (group) => /base|thick|consistenc/i.test(group.name);

export function splitCardGroups(groups = []) {
  return {
    card: groups.filter(group => !isFooterGroup(group)),
    footer: groups.filter(isFooterGroup),
  };
}

// The footer groups shared by a page, in Square's own wording and order.
export function footerGroupsFor(cards = []) {
  const byId = new Map();
  cards.forEach(card => splitCardGroups(card.modifier_groups).footer.forEach(group => {
    if (!byId.has(group.id)) byId.set(group.id, group);
  }));
  return [...byId.values()];
}

export function squareMoney(money) {
  if (!money || money.amount == null || !money.currency) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: money.currency })
    .format(Number(money.amount) / 100);
}