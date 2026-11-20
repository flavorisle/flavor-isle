import React from 'react';
import { Flame, Heart } from 'lucide-react';
import TicketCard from '@/components/ui/TicketCard';
import PhotoTile from '@/components/ui/PhotoTile';
import PriceChip from '@/components/ui/PriceChip';

// One menu item as a kitchen-ticket row (issue #339). Presentation only: every
// action is handed in by MenuItemCard, which owns the cart, the modal, the
// favorite record and the sold-out/happy-hour state — so nothing about ordering
// lives here.
const TONES = {
  yellow: 'bg-smashie-yellow text-[#003366]',
  cherry: 'bg-midnight-cherry text-white',
  navy: 'bg-obsidian-roast text-white',
};

export default function MenuTicketRow({
  item,
  imageUrl,
  soldOut,
  price,
  wasPrice,
  badges = [],
  trendingLabel,
  onOpen,
  onAdd,
  addLabel,
  addDisabled,
  added,
  modifierCount = 0,
  showFavorite,
  isFavorite,
  onFavorite,
  savingFavorite,
  shareNode,
}) {
  const priceNode = (
    <span className="flex items-center gap-1.5">
      {wasPrice != null && (
        <span className="text-xs tabular-nums text-muted-foreground line-through">${Number(wasPrice).toFixed(2)}</span>
      )}
      <PriceChip amount={price} />
    </span>
  );

  return (
    <TicketCard
      title={item.name}
      price={priceNode}
      leading={
        <button
          type="button"
          onClick={onOpen}
          aria-label={`View ${item.name}`}
          className="block tap-44 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-cherry focus-visible:ring-offset-2"
        >
          <PhotoTile
            imageUrl={imageUrl}
            alt={item.name}
            size="sm"
            className={soldOut ? 'grayscale opacity-60' : ''}
          />
        </button>
      }
      meta={badges.length > 0 ? badges.map((b) => (
        <span key={b.label} className={`rounded-full px-2.5 py-0.5 font-heading text-[10px] uppercase tracking-wider ${TONES[b.tone] || TONES.cherry}`}>
          {b.label}
        </span>
      )) : null}
    >
      {trendingLabel && (
        <div className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-midnight-cherry px-2.5 py-0.5 font-heading text-[10px] uppercase tracking-wider text-white">
          <Flame size={10} className="text-smashie-yellow" /> {trendingLabel}
        </div>
      )}

      {item.description && (
        <p className="text-sm leading-relaxed line-clamp-2 text-muted-foreground">{item.description}</p>
      )}

      {item.tags && item.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-patina-mint/10 px-2 py-0.5 text-xs font-semibold text-patina-mint">{tag}</span>
          ))}
        </div>
      )}

      {item.calories && <p className="mt-1 text-xs text-muted-foreground">{item.calories} cal</p>}

      {modifierCount > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">
          {modifierCount} customization{modifierCount !== 1 ? 's' : ''} available
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        {showFavorite && (
          <button
            type="button"
            onClick={onFavorite}
            disabled={savingFavorite}
            aria-label="Save to favorites"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-muted transition-colors hover:bg-white disabled:opacity-60"
          >
            <Heart size={18} className={isFavorite ? 'fill-midnight-cherry text-midnight-cherry' : 'text-gray-400'} />
          </button>
        )}
        {shareNode}
        <button
          type="button"
          onClick={onAdd}
          disabled={addDisabled}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-heading text-sm transition-colors tap-44 ${
            addDisabled
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : added
                ? 'bg-patina-mint text-white'
                : 'bg-midnight-cherry text-white hover:bg-red-800'
          }`}
        >
          {addLabel}
        </button>
      </div>
    </TicketCard>
  );
}