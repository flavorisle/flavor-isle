import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowRight } from 'lucide-react';
import FavoritePhotoCard from './FavoritePhotoCard';
import { isExcludedFromMarketing } from '@/lib/menuMarketing';

// Horizontal rail of the top 10 best-sellers (online + in-store). Only items
// actually stamped is_fan_favorite === true are shown, ranked by
// fan_favorite_rank, each card carrying the item's own photo. The rank comes
// straight from the entity — no storage snapshot or cached copy is read.
export default function FanFavoritesSection({ items }) {
  const favorites = items
    .filter((i) => i.is_fan_favorite === true && !i.is_hidden && !isExcludedFromMarketing(i))
    .map((item) => ({ ...item, rank: item.fan_favorite_rank }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 10);

  if (favorites.length === 0) return null;

  return (
    <div className="mb-2">
      <div className="flex items-center gap-4 mb-5">
        <h2 className="font-heading text-2xl text-obsidian-roast flex items-center gap-2 whitespace-nowrap">
          <Star size={22} className="text-smashie-yellow fill-smashie-yellow" />
          Fan Favorites
        </h2>
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">Top 10 best-sellers</span>
        <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-1.5 px-4 py-2 text-xs font-heading whitespace-nowrap">
          View Menu <ArrowRight size={13} />
        </Link>
      </div>
      <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-2 snap-x">
        {favorites.map((item) => (
          <div key={item.id} className="snap-start flex-shrink-0 w-72 relative">
            <span className={`absolute top-2 left-2 z-20 pointer-events-none rounded-full px-3 py-1.5 text-xs font-heading shadow-float ${item.rank <= 3 ? 'bg-smashie-yellow text-accent-foreground' : 'bg-patina-mint text-white'}`}>
              TOP #{item.rank}
            </span>
            <FavoritePhotoCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}