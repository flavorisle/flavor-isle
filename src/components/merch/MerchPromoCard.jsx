// Compact Tasty Threads promo card — sized for narrow columns like the order
// confirmation page, where the full-width homepage MerchPromo is too heavy.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shirt, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

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
        setPreviews(products.slice(0, 3));
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
      <div className="flex items-center gap-2 mb-1">
        <Shirt size={16} className="text-white/80" />
        <p className="text-[11px] font-heading uppercase tracking-widest text-white/70">Flavor Isle Merch</p>
      </div>
      <h3 className="font-heading text-2xl text-white mb-1">Tasty Threads</h3>
      <p className="text-red-200 text-sm mb-4">
        Rep the flavor while you wait — tees, cups, and gear shipped to your door.
      </p>

      <div className="flex gap-2 mb-4">
        {loading
          ? [0, 1, 2].map(i => (
              <div key={i} className="w-20 h-20 rounded-xl bg-white/10 animate-pulse" />
            ))
          : previews.map(p => (
              <Link
                key={p.id}
                to="/merch"
                className="block w-20 h-20 rounded-xl overflow-hidden bg-white/10 border border-white/20 hover:scale-105 transition-transform"
              >
                <img src={p.thumbnail_url} alt={p.name} className="w-full h-full object-cover" />
              </Link>
            ))}
      </div>

      <Link
        to="/merch"
        className="w-full bg-white text-midnight-cherry font-heading text-sm px-6 py-3 rounded-xl hover:bg-vanilla-malt transition-colors inline-flex items-center justify-center gap-2"
      >
        Shop the Collection <ArrowRight size={15} />
      </Link>
    </div>
  );
}