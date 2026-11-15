import React from 'react';
import { Check } from 'lucide-react';
import { optimizedImageUrl } from '@/lib/utils';

// One numbered step of the three-step picker: a heading, an optional per-column
// search once the list gets long, and its own scroll area so the page never runs
// away on a phone.
export default function ComboStepColumn({
  step,
  label,
  hint,
  items,
  selected,
  onSelect,
  quantityOf,
  search,
  onSearch,
  action,
}) {
  const many = items.length > 8;
  const query = (search || '').trim().toLowerCase();
  const shown = query
    ? items.filter((i) => String(i.name || '').toLowerCase().includes(query))
    : items;

  return (
    <div className="flex flex-col">
      <p className="font-heading text-[11px] uppercase tracking-[0.2em] text-midnight-cherry mb-1">Step {step}</p>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">{label}</p>
        {action}
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">{hint}</p>

      {many && (
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search"
          className="mb-2 w-full rounded-xl border border-border px-3 py-2 text-xs bg-white"
        />
      )}

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nothing available in this step right now.</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {shown.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No match for “{search}”.</p>
          )}
          {shown.map((item) => {
            const isSelected = selected?.id === item.id;
            const quantity = quantityOf(item);
            const mods = (selected?.selectedModifiers || []).filter((m) => m.name && !m.silent);
            return (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-midnight-cherry bg-midnight-cherry/5'
                    : 'border-border bg-white hover:border-midnight-cherry/40'
                }`}
              >
                {(item.image_url_opt || item.image_url) && (
                  <img
                    src={optimizedImageUrl(item.image_url_opt || item.image_url, 200, 200)}
                    alt=""
                    width="200"
                    height="200"
                    loading="lazy"
                    decoding="async"
                    className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-xs text-obsidian-roast truncate">
                    {quantity > 1 ? `${quantity} × ${item.name}` : item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ${((item.price || 0) * quantity).toFixed(2)}
                  </p>
                  {isSelected && mods.length > 0 && (
                    <p className="text-xs text-patina-mint mt-0.5 truncate">
                      {mods.map((m) => m.name).join(', ')}
                    </p>
                  )}
                </div>
                {isSelected && <Check size={16} className="text-midnight-cherry flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}