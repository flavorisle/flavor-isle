import React from 'react';
import { Check, X } from 'lucide-react';
import PhotoTile from '@/components/ui/PhotoTile';

// Issue #341 (E2) — the tap-to-fill drawer one slot opens. Presentation only:
// it lists the items that slot already offers (same lists, same rules, same
// quantities) as photo tiles and hands the tapped one back. It sits in the page
// flow, so nothing locks the page scroll.
export default function ComboPickerDrawer({
  label,
  hint,
  items,
  selectedId,
  onSelect,
  onClose,
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
    <div className="mt-4 rounded-2xl border-2 border-midnight-cherry/30 bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">Pick your {label}</p>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {action}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close picker"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {many && (
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search"
          className="mb-3 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs"
        />
      )}

      {items.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">Nothing available in this step right now.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[420px] overflow-y-auto pr-1">
          {shown.length === 0 && (
            <p className="text-xs italic text-muted-foreground">No match for “{search}”.</p>
          )}
          {shown.map((item) => {
            const quantity = quantityOf(item);
            const isSelected = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className={`rounded-xl border-2 p-1.5 text-left transition-all ${
                  isSelected
                    ? 'border-midnight-cherry bg-midnight-cherry/5'
                    : 'border-transparent hover:border-midnight-cherry/30'
                }`}
              >
                <div className="relative">
                  <PhotoTile
                    imageUrl={item.image_url_opt || item.image_url}
                    alt={item.name}
                    size="md"
                    className="w-full h-auto"
                  />
                  {isSelected && (
                    <Check size={14} className="absolute right-1 top-1 rounded-full bg-midnight-cherry p-0.5 text-white" aria-hidden="true" />
                  )}
                </div>
                <p className="mt-1.5 font-heading text-[11px] leading-tight text-obsidian-roast line-clamp-2">
                  {quantity > 1 ? `${quantity} × ${item.name}` : item.name}
                </p>
                <p className="text-[11px] text-muted-foreground">${((item.price || 0) * quantity).toFixed(2)}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}