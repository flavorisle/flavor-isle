import React, { useMemo } from 'react';
import MenuItemCard from '@/components/MenuItemCard';
import { itemCategoryKey, categoryLabel, sortCategories } from '@/lib/menuCategory';

// The group's menu, drawn with the menu's own card — the ticket row /menu shows —
// so a participant adds an item exactly the way they would on the menu, including
// the real modifier sheet behind CUSTOMIZE & ADD (issue #356).
export default function GroupMenuCards({ items = [], hiddenCategories = [], hiddenIds = [] }) {
  const rows = useMemo(() => {
    const skip = new Set(hiddenCategories || []);
    const skipIds = new Set(hiddenIds || []);
    const map = {};
    for (const item of items) {
      if (item.is_hidden || skipIds.has(item.id)) continue;
      const key = itemCategoryKey(item);
      if (skip.has(key)) continue;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return sortCategories(Object.keys(map)).map((key) => ({ key, items: map[key] }));
  }, [items, hiddenCategories, hiddenIds]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-8">
      {rows.map((row) => (
        <section key={row.key}>
          <div className="flex items-center gap-4 mb-3">
            <h3 className="font-heading text-xl text-obsidian-roast whitespace-nowrap">{categoryLabel(row.key)}</h3>
            <div className="flex-1 h-px bg-border" />
          </div>
          <div className="space-y-3">
            {row.items.map((item) => (
              <MenuItemCard key={item.id} item={item} variant="ticket" />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}