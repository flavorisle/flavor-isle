import React from 'react';
import { Check, Plus } from 'lucide-react';
import PhotoTile from '@/components/ui/PhotoTile';

// Issue #341 (E2) — one large photo slot of the Combo Isle picker. Presentation
// only: it shows the item already picked for this slot (or an empty slot to tap)
// and opens the drawer. It never prices, counts or decides anything.
export default function ComboSlot({ step, label, hint, item, quantity = 1, open, onOpen }) {
  const price = (item?.price || 0) * quantity;
  const mods = (item?.selectedModifiers || []).filter((m) => m.name && !m.silent);

  return (
    <div className="flex flex-col">
      <p className="font-heading text-[11px] uppercase tracking-[0.2em] text-midnight-cherry mb-1">Step {step}</p>
      <p className="font-heading text-sm uppercase tracking-widest text-obsidian-roast mb-2">{label}</p>

      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        aria-label={item ? `Change your ${label.toLowerCase()}: ${item.name}` : `Pick your ${label.toLowerCase()}`}
        className={`relative block w-full rounded-2xl border-2 text-left transition-all ${
          open
            ? 'border-midnight-cherry'
            : item
              ? 'border-border hover:border-midnight-cherry/40'
              : 'border-dashed border-border hover:border-midnight-cherry/50'
        }`}
      >
        {item ? (
          <PhotoTile
            imageUrl={item.image_url_opt || item.image_url}
            alt={item.name}
            size="lg"
            className="rounded-xl"
          />
        ) : (
          <div className="aspect-square w-full rounded-xl bg-muted/60 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Plus size={22} aria-hidden="true" />
            <span className="px-2 text-center font-heading text-[11px] uppercase tracking-widest">Tap to pick</span>
          </div>
        )}

        <div className="p-2">
          {item ? (
            <>
              <p className="font-heading text-xs leading-tight text-obsidian-roast line-clamp-2">
                {quantity > 1 ? `${quantity} × ${item.name}` : item.name}
              </p>
              <p className="text-[11px] text-muted-foreground">${price.toFixed(2)}</p>
              {mods.length > 0 && (
                <p className="text-[10px] text-patina-mint truncate">{mods.map((m) => m.name).join(', ')}</p>
              )}
            </>
          ) : (
            <p className="text-[11px] leading-tight text-muted-foreground">{hint}</p>
          )}
        </div>

        {item && (
          <Check size={16} className="absolute right-2 top-2 rounded-full bg-midnight-cherry p-0.5 text-white" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}