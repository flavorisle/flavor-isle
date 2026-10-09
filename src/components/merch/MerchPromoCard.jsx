// Compact Tasty Threads promo card — sized for narrow columns like the order
// confirmation page, where the full-width homepage MerchPromo is too heavy.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { optimizedImageUrl } from '@/lib/utils';

export default function MerchPromoCard() {
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('getPrintfulProducts', {});
        if (cancelled) return;
        const products = (res.data?.products || []).filter(p => p.thumbnail_url);
        setPreviews(products.slice(0, 12));
      } catch (err) {
        // Silent fail — the promo still renders without previews.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-midnight-cherry rounded-2xl p-5 text-left">
      {/* Tasty Threads brand logo */}
      <img
        src={optimizedImageUrl('https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/cc3a8ab5c_Copilot_20250829_140545.png', 400, 300, 'fit')}
        alt="Tasty Threads — Flavor Isle Apparel"
        width="400"
        height="300"
        loading="lazy"
        decoding="async"
        className="w-40 h-auto bg-white rounded-xl p-2 mb-3"
      />
      <p className="text-red-200 text-sm mb-4">
        Rep the flavor while you wait — tees, cups, and gear shipped to your door.
      </p>

      {/* Horizontal carousel — swipe/scroll through the collection */}
      <div className="relative -mx-1 mb-4">
        <div className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-1 pb-1">
          {loading
            ? [0, 1, 2, 3].map(i => (
                <div key={i} className="w-28 flex-shrink-0">
                  <div className="w-28 h-28 rounded-xl bg-white/10 animate-pulse" />
                </div>
              ))
            : previews.map(p => (
                <Link
                  key={p.id}
                  to="/merch"
                  className="w-28 flex-shrink-0 snap-start group"
                >
                  <div className="w-28 h-28 rounded-xl overflow-hidden bg-white/10 border border-white/20 group-hover:scale-105 transition-transform">
                    <img src={p.thumbnail_url} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-white text-[11px] font-heading mt-1.5 leading-tight line-clamp-2">{p.name}</p>
                  {p.fromPrice ? (
                    <p className="text-red-200 text-[11px]">from ${p.fromPrice.toFixed(2)}</p>
                  ) : null}
                </Link>
              ))}
        </div>
        {/* Fade hint that there's more to scroll */}
        <div className="pointer-events-none absolute top-0 right-0 h-full w-10 bg-gradient-to-l from-midnight-cherry to-transparent" />
      </div>

      {!loading && previews.length > 3 && (
        <p className="text-white/60 text-[11px] mb-3">← Swipe for more</p>
      )}

      <Link
        to="/merch"
        className="w-full bg-white text-midnight-cherry font-heading text-sm px-6 py-3 rounded-xl hover:bg-vanilla-malt transition-colors inline-flex items-center justify-center gap-2"
      >
        Shop the Collection <ArrowRight size={15} />
      </Link>
    </div>
  );
}