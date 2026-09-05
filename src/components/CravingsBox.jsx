import React, { useState, useEffect } from 'react';
import { Star, Flame } from 'lucide-react';
import MenuItemCard from './MenuItemCard';
import { loadApprovedReviews } from './ItemRatings';

// "Cravings Box" — a horizontal rail of the highest-rated menu items, pulled
// from approved customer reviews. Complements the Fan Favorites rail (which
// is sales-based) by surfacing what diners love most by rating.
// Reuses the module-level approved-reviews cache from ItemRatings so we never
// fire a second fetch on menu-heavy pages.
export default function CravingsBox({ items }) {
  const [cravings, setCravings] = useState([]);

  useEffect(() => {
    let cancelled = false;
    loadApprovedReviews().then(reviews => {
      if (cancelled) return;
      // Tally ratings per menu item id.
      const tally = {};
      for (const r of reviews || []) {
        if (!r.menu_item_id) continue;
        if (!tally[r.menu_item_id]) tally[r.menu_item_id] = { sum: 0, count: 0 };
        tally[r.menu_item_id].sum += (r.rating || 0);
        tally[r.menu_item_id].count += 1;
      }

      const ranked = items
        .filter(i => i && !i.is_hidden && tally[i.id])
        .map(i => {
          const t = tally[i.id];
          return { ...i, avgRating: t.sum / t.count, reviewCount: t.count };
        })
        .filter(i => i.reviewCount >= 1)
        .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
        .slice(0, 8);

      if (!cancelled) setCravings(ranked);
    });
    return () => { cancelled = true; };
  }, [items]);

  if (cravings.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-4 mb-5">
        <h2 className="font-heading text-2xl text-obsidian-roast flex items-center gap-2 whitespace-nowrap">
          <Flame size={22} className="text-midnight-cherry" />
          Cravings Box
        </h2>
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-muted-foreground">Top rated by you</span>
      </div>
      <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-2 snap-x">
        {cravings.map(item => (
          <div key={item.id} className="snap-start flex-shrink-0 w-72 relative">
            <div className="absolute -top-2 -left-2 z-30 bg-midnight-cherry text-white text-xs font-heading px-2 h-7 rounded-full flex items-center gap-1 shadow-float">
              <Star size={11} className="fill-smashie-yellow text-smashie-yellow" />
              {item.avgRating.toFixed(1)}
            </div>
            <MenuItemCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}