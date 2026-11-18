// Rebuilds the modifier panel's own selection state from a bag line, so a line
// can be reopened and adjusted instead of deleted and ordered again.
//
// A line stores its build as a flat, display-ready list (selectedModifiers:
// { group, name, price, id, silent }). A Lite/Extra level is folded into the
// parent's name ("Extra Pickle") while the level's own catalog option rides
// along as a silent row, and a follow-up pick (ice, flavor) rides along too.
// Matching those option ids back to the catalog groups is what restores both
// the chosen options and their child-list picks — for any item, not just drinks.
export function restorePanelSelection(groups = [], cartItem) {
  const savedModifiers = cartItem?.selectedModifiers || [];
  const savedIds = new Set(savedModifiers.map((entry) => entry.id).filter(Boolean));

  const selections = Object.fromEntries(
    groups.map((group) => [
      group.name,
      group.selection_type === 'MULTIPLE'
        ? []
        : group.name === 'Size'
          ? group.modifiers?.find((mod) => !mod.sold_out) || group.modifiers?.[0] || null
          : null,
    ]),
  );

  const nested = {};
  // Square nests follow-up lists up to three levels deep — walk them all, so a
  // reopened item shows every choice it was ordered with. The panel keeps them
  // flat under the top-level option's id, keyed by list name.
  const readChildLists = (parentId, lists) => {
    const restored = {};
    for (const list of lists || []) {
      const picks = (list.modifiers || []).filter((option) => savedModifiers.some((entry) =>
        entry.id === option.id && (!entry.parent_modifier_id || entry.parent_modifier_id === parentId)));
      if (!picks.length) continue;
      const options = picks.map((option) => {
        const children = readChildLists(option.id, option.child_modifier_lists);
        return Object.keys(children).length ? { ...option, nestedSelections: children } : option;
      });
      restored[list.name] = list.selection_type === 'MULTIPLE' ? options : options[0];
    }
    return restored;
  };
  const restoreChildLists = (parentId, lists) => {
    const restored = readChildLists(parentId, lists);
    if (Object.keys(restored).length) nested[parentId] = restored;
  };

  for (const group of groups) {
    const chosen = (group.modifiers || []).filter((mod) => savedIds.has(mod.id));
    if (chosen.length === 0) continue;
    selections[group.name] = group.selection_type === 'MULTIPLE' ? chosen : chosen[0];
    chosen.forEach((mod) => restoreChildLists(mod.id, mod.child_modifier_lists));
  }

  return { selections, nested };
}