// Homepage promo block for the Tasty Threads store — pulls live product previews.
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shirt, ArrowRight, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function MerchPromo() {
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('getPrintfulProducts', {});
        if (cancelled) return;
        const products = (res.data?.products || []).filter(p => p.thumbnail_url);
        setPreviews(products.slice(0, 2));
      } catch (err) {
        // Silent fail — the promo still renders without previews.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="py-16 px-4 sm:px-6 bg-midnight-cherry">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-8">
        {/* Live product previews */}
        <div className="flex gap-3 flex-shrink-0">
          {loading ? (
            <>
              <div className="w-24 h-24 rounded-2xl bg-white/10 animate-pulse" />
              <div className="w-24 h-24 rounded-2xl bg-white/10 animate-pulse hidden sm:block" />
            </>
          ) : previews.length > 0 ? (
            previews.map(p => (
              <Link
                key={p.id}
                to="/merch"
                className="block w-24 h-24 rounded-2xl overflow-hidden bg-white/10 border border-white/20 hover:scale-105 transition-transform"
              >
                <img
                  src={p.thumbnail_url}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
              </Link>
            ))
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
              <Shirt size={44} className="text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 text-center md:text-left">
          <p className="text-sm font-heading uppercase tracking-widest text-white/70 mb-2">FLAVOR ISLE MERCH</p>
          <h2 className="font-heading text-4xl text-white mb-2">Tasty Threads</h2>
          <p className="text-red-200 max-w-xl">
            Rep the flavor with tees, cups, and gear — printed on demand and shipped to your door.
          </p>
          <p className="text-white/60 text-xs mt-2 inline-flex items-center gap-1">
            <Clock size={12} /> Made to order · ships in 4–12 business days
          </p>
          {previews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-4 justify-center md:justify-start">
              {previews.map(p => (
                <p key={p.id} className="text-white/90 text-sm">
                  <span className="font-heading">{p.name}</span>
                  {p.fromPrice ? <span className="text-white/60 ml-2">from ${p.fromPrice.toFixed(2)}</span> : null}
                </p>
              ))}
            </div>
          )}
        </div>
        <Link to="/merch" className="bg-white text-midnight-cherry font-heading px-8 py-4 rounded-2xl hover:bg-vanilla-malt transition-colors chrome-hover inline-flex items-center gap-2 whitespace-nowrap">
          Shop Now <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}