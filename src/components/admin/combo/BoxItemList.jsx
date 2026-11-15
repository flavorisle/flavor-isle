import React, { useMemo, useState } from 'react';
import { itemsForRole, typeCategories } from '@/lib/comboIsle';

// "In a box, and Show": every item the combos currently resolve to, grouped under
// its combo type in type order, with how many make one box slot and whether the
// picker shows it at all.
export default function BoxItemList({ items, setting, types, quantityOf, onQuantity, hiddenIds, onToggleShow }) {
  const [query, setQuery] = useState('');
  const hidden = new Set(hiddenIds || []);

  const groups = useMemo(() => types.map((type) => {
    const effective = {
      ...setting,
      main_categories: typeCategories(setting, type, 'main'),
      side_categories: typeCategories(setting, type, 'side'),
      drink_categories: typeCategories(setting, type, 'drink'),
      shake_categories: (type.shake_categories || []).length
        ? type.shake_categories
        : (setting?.shake_categories || []),
    };
    const seen = new Set();
    const rows = ['main', 'side', 'drink']
      .flatMap((role) => itemsForRole(items, effective, role))
      .filter((item) => {
        if (seen.has(item.square_item_id)) return false;
        seen.add(item.square_item_id);
        return true;
      });
    return { type, rows };
  }), [items, setting, types]);

  const q = query.trim().toLowerCase();
  const visible = groups
    .map((group) => ({
      ...group,
      rows: q ? group.rows.filter((i) => String(i.name || '').toLowerCase().includes(q)) : group.rows,
    }))
    .filter((group) => group.rows.length > 0);

  return (
    <div className="bg-white rounded-2xl border border-border p-4">
      <p className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">In a box, and Show</p>
      <p className="text-[11px] text-muted-foreground mb-3">
        How many of an item make one box, and whether it shows in the picker at all.
      </p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search items"
        className="w-full rounded-xl border border-border px-3 py-2 text-xs mb-3"
      />

      {visible.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No items in these categories yet.</p>
      ) : (
        visible.map(({ type, rows }) => (
          <div key={type.id} className="mb-4 last:mb-0">
            <p className="text-[11px] font-heading uppercase tracking-widest text-midnight-cherry mb-1">
              {type.name}
            </p>
            <div className="divide-y divide-border">
              {rows.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-obsidian-roast truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">${(item.price || 0).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      In a box
                      <input
                        type="number"
                        min={1}
                        max={9}
                        value={quantityOf(item)}
                        onChange={(e) => onQuantity(item, e.target.value)}
                        className="w-14 rounded-lg border border-border px-2 py-1 text-xs"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={!hidden.has(item.id)}
                        onChange={() => onToggleShow(item)}
                        className="w-4 h-4"
                      />
                      Show
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}