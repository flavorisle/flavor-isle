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