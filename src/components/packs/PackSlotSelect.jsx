import React from 'react';

// One pick on the Weekend Party Pack card. Plain select: every choice on the
// pack is one of the approved items at $0 of modification, so the pack price
// never moves.
export default function PackSlotSelect({ label, itemIds, itemsById, value, onChange, disabled }) {
  return (
    <label className="block">
      <span className="text-xs font-heading uppercase tracking-wide text-obsidian-roast">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-1 w-full rounded-xl border-2 border-border bg-white px-3 py-2.5 text-sm font-heading text-obsidian-roast outline-none focus:border-midnight-cherry disabled:opacity-50"
      >
        {itemIds.map((id) => {
          const item = itemsById.get(id);
          return item ? <option key={id} value={id}>{item.name}</option> : null;
        })}
      </select>
    </label>
  );
}