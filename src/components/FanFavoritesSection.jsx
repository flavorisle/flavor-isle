import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { isExcludedFromMarketing } from '@/lib/menuMarketing';
import { BLISS_CATEGORY, SKIP_ITEM_NAMES } from '@/lib/buildCards';
import { productPath } from '@/lib/productSlug';
import { optimizedImageUrl } from '@/lib/utils';
import { SHAKE_ISLE_IMAGE } from '@/components/ShakeIslePhotoCard';

const MAX_ROWS = 10;

export default function FanFavoritesSection({ items, shakeRank }) {
  const [shakeFlavors, setShakeFlavors] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      base44.entities.MenuItem.filter({ square_category: 'Whirl & Twirl', is_hidden: false }),
      base44.entities.MenuItem.list(),
    ]).then(([shakes, all]) => {
      if (!active) return;
      const skip = new Set(SKIP_ITEM_NAMES.map((n) => String(n).trim().toLowerCase()));
      const bliss = (all || []).filter((i) => i.square_category === BLISS_CATEGORY && i.is_hidden !== true && !skip.has(String(i.name || '').trim().toLowerCase())).length;
      setShakeFlavors((shakes || []).length + bliss);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const favorites = items
    .filter((i) => i.is_fan_favorite === true && !i.is_hidden && !isExcludedFromMarketing(i))
    .map((item) => ({ ...item, rank: item.fan_favorite_rank }))
    .concat(shakeRank ? [{ id: 'shake-isle', rank: shakeRank, shake: true }] : [])
    .sort((a, b) => a.rank - b.rank)
    .slice(0, MAX_ROWS);

  if (favorites.length === 0) return null;

  return (
    <div className="mb-2">
      <div className="flex items-center gap-4 mb-4">
        <h2 className="font-heading text-2xl text-obsidian-roast flex items-center gap-2 whitespace-nowrap">
          <Star size={22} className="text-smashie-yellow fill-smashie-yellow" />
          Fan Favorites
        </h2>
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">Top 10 best-sellers</span>
        <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-1.5 px-4 py-2 text-xs font-heading whitespace-nowrap">View Menu <ArrowRight size={13} /></Link>
      </div>
      <ul className="border-t border-border">
        {favorites.map((item) => {
          const to = item.shake ? '/milkshakes' : productPath(item);
          const name = item.shake ? 'Shake Isle milkshakes' : item.name;
          const right = item.shake ? (shakeFlavors ? `${shakeFlavors} flavors` : 'Flavors') : `$${Number(item.price || 0).toFixed(2)}`;
          const thumb = item.shake ? SHAKE_ISLE_IMAGE : (item.image_url_opt || item.image_url);
          return (
            <li key={item.id} className="border-b border-border">
              <Link to={to} className="flex items-center gap-3 py-3 px-1 hover:bg-black/[0.03] focus-visible:outline-2 focus-visible:outline-primary" aria-label={`View ${name}`}>
                <span className={`font-heading text-[15px] w-[26px] h-[26px] flex-none rounded-full inline-flex items-center justify-center ${item.rank <= 3 ? 'bg-smashie-yellow text-accent-foreground' : 'bg-vanilla-malt text-obsidian-roast'}`}>{item.rank}</span>
                {thumb ? (
                  <img src={optimizedImageUrl(thumb, 160, 160)} alt="" aria-hidden="true" width="56" height="56" loading="lazy" decoding="async" className="flex-none w-14 h-14 rounded-lg object-cover border border-border" />
                ) : (
                  <span aria-hidden="true" className="flex-none w-14 h-14 rounded-lg bg-vanilla-malt border border-border" />
                )}
                <span className="font-heading text-[20px] leading-tight text-obsidian-roast">{name}</span>
                <span aria-hidden="true" className="flex-1 border-b-2 border-dotted border-border min-w-4 self-end mb-2" />
                <span className="font-heading text-[19px] text-midnight-cherry whitespace-nowrap">{right}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}