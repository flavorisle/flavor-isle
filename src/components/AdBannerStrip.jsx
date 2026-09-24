import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const THEMES = {
  cherry: { bg: 'bg-midnight-cherry', text: 'text-white', sub: 'text-white/80', btn: 'bg-white text-midnight-cherry' },
  navy: { bg: 'bg-obsidian-roast', text: 'text-white', sub: 'text-white/70', btn: 'bg-smashie-yellow text-obsidian-roast' },
  yellow: { bg: 'bg-smashie-yellow', text: 'text-obsidian-roast', sub: 'text-obsidian-roast/70', btn: 'bg-obsidian-roast text-white' },
};

// Today's date in store-local time (America/Chicago) as YYYY-MM-DD, so scheduled
// banners respect the same timezone the admin set start_date/end_date in.
function todayStoreLocal() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
}

// A banner only displays when is_active is true AND the current store-local
// date falls within its [start_date, end_date) window. start_date is inclusive;
// end_date is exclusive. Either field is optional.
function isWithinDateWindow(banner) {
  const today = todayStoreLocal();
  if (banner.start_date && today < banner.start_date) return false;
  if (banner.end_date && today >= banner.end_date) return false;
  return true;
}

// Renders the active promo banners for a given placement: 'home' | 'menu' | 'cart'
export default function AdBannerStrip({ placement, compact = false }) {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    base44.entities.AdBanner
      .filter({ placement, is_active: true }, 'sort_order')
      .then(fetched => setBanners(fetched.filter(isWithinDateWindow)))
      .catch(() => setBanners([]));
  }, [placement]);

  if (banners.length === 0) return null;

  return (
    <div className={compact ? 'space-y-2' : 'max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4'}>
      {banners.map(b => {
        const t = THEMES[b.theme] || THEMES.cherry;
        return (
          <div key={b.id} className={`${t.bg} rounded-3xl overflow-hidden flex items-center gap-4 ${compact ? 'p-3' : 'p-5 sm:p-6'}`}>
            {b.image_url && (
              <img
                src={b.image_url}
                alt={b.headline}
                className={`${compact ? 'w-14 h-14' : 'w-24 h-24 sm:w-28 sm:h-28'} object-cover rounded-2xl flex-shrink-0`}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className={`font-heading ${compact ? 'text-base' : 'text-2xl sm:text-3xl'} ${t.text} leading-tight`}>{b.headline}</p>
              {b.subtext && <p className={`${compact ? 'text-xs' : 'text-sm mt-1'} ${t.sub}`}>{b.subtext}</p>}
            </div>
            {b.cta_link && (
              <Link
                to={b.cta_link}
                className={`${t.btn} font-heading rounded-full flex items-center gap-2 flex-shrink-0 tap-44 justify-center ${compact ? 'px-4 py-2 text-xs' : 'px-6 py-3 text-sm'}`}
              >
                {b.cta_label || 'Order Now'} <ArrowRight size={compact ? 13 : 16} />
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}