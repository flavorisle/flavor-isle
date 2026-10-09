// Admin modifier controls — applied to every customer-facing modifier list.
//
// Square owns the modifier catalog: syncSquareCatalog writes each MenuItem's
// `modifiers` array, and nested `child_modifier_lists` (up to 3 levels deep) for
// follow-up choices. The admin panel stores *overrides* on
// MenuSetting.modifier_overrides instead of editing that catalog, so a Square
// sync can never wipe them:
//
//   hidden_groups     — group/list keys hidden from customers (parent + child)
//   hidden_options    — modifier option ids hidden from customers
//   sold_out_options  — option ids still shown, but not selectable
//   option_prices     — option id → site price in USD (overrides Square)
//
// applyModifierOverrides() returns the effective groups for a menu item, so the
// customer sees and is charged exactly what the admin configured. The server
// mirrors the price half of this in base44/shared/modifierOverrides.ts.

export const EMPTY_OVERRIDES = {
  hidden_groups: [],
  hidden_options: [],
  sold_out_options: [],
  option_prices: {},
};

// Fill in any missing key so a partially stored override object can never crash
// the menu — every reader works from a complete shape.
function normalize(overrides) {
  const o = overrides || {};
  return {
    hidden_groups: Array.isArray(o.hidden_groups) ? o.hidden_groups : [],
    hidden_options: Array.isArray(o.hidden_options) ? o.hidden_options : [],
    sold_out_options: Array.isArray(o.sold_out_options) ? o.sold_out_options : [],
    option_prices: o.option_prices && typeof o.option_prices === 'object' ? o.option_prices : {},
  };
}

// Normalize whatever is stored on MenuSetting into a complete override object.
export function getModifierOverrides(setting) {
  return normalize(setting?.modifier_overrides);
}

// Stable key for a modifier GROUP. Square lists carry their catalog id; the
// synthetic "Size" group is built from the item's variations, so it has no id
// and is keyed by name.
export function groupKey(group) {
  if (!group) return '';
  return group.id || `name:${(group.name || '').trim().toLowerCase()}`;
}

export function overrideCount(overrides) {
  const o = normalize(overrides);
  return o.hidden_groups.length + o.hidden_options.length
    + o.sold_out_options.length + Object.keys(o.option_prices).length;
}

// Effective groups for one menu item: hidden groups/options removed, sold-out
// options flagged, prices replaced by any admin override. Recurses through
// nested child lists so parent and child obey the same rules. A group left with
// no visible options is dropped so no empty heading renders.
export function applyModifierOverrides(groups, overrides) {
  if (!Array.isArray(groups)) return [];
  const o = normalize(overrides);
  if (overrideCount(o) === 0) return groups;

  const hiddenGroups = new Set(o.hidden_groups);
  const hiddenOptions = new Set(o.hidden_options);
  const soldOutOptions = new Set(o.sold_out_options);
  const prices = o.option_prices;

  const mapList = (list) => ({
    ...list,
    modifiers: (list.modifiers || [])
      .filter((m) => !(m?.id && hiddenOptions.has(m.id)))
      .map((m) => {
        const next = { ...m };
        if (m?.id && prices[m.id] != null) next.price = Number(prices[m.id]) || 0;
        if (m?.id && soldOutOptions.has(m.id)) next.sold_out = true;
        const children = (m?.child_modifier_lists || [])
          .filter((l) => !hiddenGroups.has(groupKey(l)))
          .map(mapList)
          .filter((l) => l.modifiers.length > 0);
        if (children.length > 0) next.child_modifier_lists = children;
        else delete next.child_modifier_lists;
        return next;
      }),
  });

  return groups
    .filter((g) => !hiddenGroups.has(groupKey(g)))
    .map(mapList)
    .filter((g) => g.modifiers.length > 0);
}

// Every modifier group used across the menu, deduped by key, for the admin
// panel. `direct` marks groups attached to an item (parents) — nested child
// lists are reachable through their parent option's `childKeys`.
export function collectModifierGroups(items) {
  const groups = new Map();

  const addList = (list, itemName, direct) => {
    const key = groupKey(list);
    if (!key) return;
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        id: list.id || '',
        name: list.name || '(unnamed)',
        selection_type: list.selection_type || 'SINGLE',
        items: [],
        options: [],
        direct: false,
      };
      groups.set(key, group);
    }
    group.direct = group.direct || direct;
    if (itemName && !group.items.includes(itemName)) group.items.push(itemName);

    for (const opt of (list.modifiers || [])) {
      const optKey = opt.id || `name:${(opt.name || '').trim().toLowerCase()}`;
      let option = group.options.find((x) => x.key === optKey);
      if (!option) {
        option = {
          key: optKey,
          id: opt.id || '',
          name: opt.name || '(unnamed)',
          price: Number(opt.price) || 0,
          sold_out: !!opt.sold_out,
          childKeys: [],
        };
        group.options.push(option);
      }
      for (const child of (opt.child_modifier_lists || [])) {
        const childKey = groupKey(child);
        if (childKey && !option.childKeys.includes(childKey)) option.childKeys.push(childKey);
        addList(child, '', false);
      }
    }
  };

  for (const item of (items || [])) {
    for (const group of (item.modifiers || [])) addList(group, item?.name || '', true);
  }
  return [...groups.values()];
}