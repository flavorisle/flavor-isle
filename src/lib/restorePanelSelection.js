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
  const savedIds = new Set((cartItem?.selectedModifiers || []).map((entry) => entry.id).filter(Boolean));

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
  const restoreChildLists = (parentId, lists) => {
    for (const list of lists || []) {
      const picks = (list.modifiers || []).filter((option) => savedIds.has(option.id));
      if (picks.length === 0) continue;
      nested[parentId] = {
        ...(nested[parentId] || {}),
        [list.name]: list.selection_type === 'MULTIPLE' ? picks : picks[0],
      };
      picks.forEach((option) => restoreChildLists(parentId, option.child_modifier_lists));
    }
  };

  for (const group of groups) {
    const chosen = (group.modifiers || []).filter((mod) => savedIds.has(mod.id));
    if (chosen.length === 0) continue;
    selections[group.name] = group.selection_type === 'MULTIPLE' ? chosen : chosen[0];
    chosen.forEach((mod) => restoreChildLists(mod.id, mod.child_modifier_lists));
  }

  return { selections, nested };
}