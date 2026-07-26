// Shared category resolution used by both the public Menu page and the admin
// Menu Manager so grouping, renaming, hiding, and reordering stay consistent.

// The underlying key an item groups under. display_category overrides whatever
// came from Square so admins can build custom groupings (e.g. burger sections).
export function itemCategoryKey(item) {
  return item.display_category || item.square_category || item.category || 'Other';
}

// Human label for a category key, applying admin renames.
export function categoryLabel(key, renames = {}) {
  return renames[key] || key;
}

// Sort category keys by the admin-defined order; unknown ones append alphabetically.
export function sortCategories(keys, order = []) {
  const known = order.filter(c => keys.includes(c));
  const leftover = keys.filter(c => !order.includes(c)).sort((a, b) => a.localeCompare(b));
  return [...known, ...leftover];
}

// Sort items within one category by an ordered list of ids.
// Items absent from the order list keep their original sequence, appended after.
export function sortItemsInCategory(items, orderIds = []) {
  const byId = new Map(items.map(i => [i.id, i]));
  const ordered = [];
  const used = new Set();
  for (const id of orderIds) {
    const it = byId.get(id);
    if (it) {
      ordered.push(it);
      used.add(id);
    }
  }
  for (const it of items) if (!used.has(it.id)) ordered.push(it);
  return ordered;
}