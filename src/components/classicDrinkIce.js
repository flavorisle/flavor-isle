export const ICE_LIST_ID = '2L2MO2C5CVK5VILJZNGS26EM';

// The Square child-list identity, not an item id, gates this UI.
export function getIceContext(groups) {
  const sizeGroup = groups.find(group => group.name === 'Size');
  const sodaGroup = groups.find(group => group.modifiers?.some(mod =>
    mod.child_modifier_lists?.some(list => list.id === ICE_LIST_ID && list.name === 'How much ice?')));
  if (!sizeGroup || !sodaGroup || sizeGroup === sodaGroup) return null;
  return { sizeGroup, sodaGroup };
}

export function iceListFor(soda) {
  return soda?.child_modifier_lists?.find(list => list.id === ICE_LIST_ID && list.name === 'How much ice?');
}

export function iceOption(soda, level) {
  const name = level === 'light' ? 'Light Ice' : level === 'extra' ? 'Extra Ice' : 'Regular Ice';
  return iceListFor(soda)?.modifiers?.find(mod => mod.name === name && !mod.sold_out);
}

export function iceLevelFor(soda, nestedSelections) {
  const name = nestedSelections[soda?.id]?.[iceListFor(soda)?.name]?.name;
  return name === 'Light Ice' ? 'light' : name === 'Extra Ice' ? 'extra' : 'regular';
}

export function withIceSelection(previous, soda, level) {
  const list = iceListFor(soda);
  const option = iceOption(soda, level);
  if (!list || !option) return previous;
  return { ...previous, [soda.id]: { ...previous[soda.id], [list.name]: option } };
}

// Rebuild the selected soda's catalog choices from the cart's flattened modifiers.
export function restoreDrinkSelections(groups, cartItem) {
  const saved = cartItem?.selectedModifiers || [];
  const selections = Object.fromEntries(groups.map(group => [group.name,
    group.selection_type === 'MULTIPLE' ? [] :
      group.name === 'Size' ? group.modifiers.find(m => !m.sold_out) || group.modifiers[0] : null]));
  for (const group of groups) {
    const selected = group.modifiers.filter(mod => saved.some(entry => entry.id === mod.id));
    if (selected.length) selections[group.name] = group.selection_type === 'MULTIPLE' ? selected : selected[0];
  }
  const context = getIceContext(groups);
  const soda = context && selections[context.sodaGroup.name];
  if (!soda) return { selections, nested: {} };
  const nested = {};
  for (const list of soda.child_modifier_lists || []) {
    const choices = list.modifiers.filter(mod => saved.some(entry => entry.id === mod.id));
    if (choices.length) nested[list.name] = list.selection_type === 'MULTIPLE' ? choices : choices[0];
  }
  return { selections, nested: { [soda.id]: nested } };
}