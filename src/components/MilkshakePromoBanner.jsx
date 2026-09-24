import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Dynamic promo banner for the Shake Isle page. Pulls the live flavor count
// and starting price from the milkshake menu items so the offer always
// matches what's actually available.
//   variant="feature" — large block for the home page
//   variant="strip"    — horizontal card that replaces the shake category row on the menu
export default function MilkshakePromoBanner({ variant = 'feature' }) {
  const [shakes, setShakes] = useState([]);

  useEffect(() => {
    base44.entities.MenuItem
      .filter({ square_category: 'Whirl & Twirl', is_hidden: false })
      .then((items) => setShakes((items || []).filter((i) => i.is_available !== false)))
      .catch(() => setShakes([]));
  }, []);

  const regularCount = shakes.filter((s) => !/malt/i.test(s.name || '')).length;
  const maltCount = shakes.filter((s) => /malt/i.test(s.name || '')).length;
  const PREMIUM_COUNT = 5;
  const totalCount = regularCount + maltCount + PREMIUM_COUNT;

  const fromPrice = (() => {
    if (shakes.length === 0) return null;
    const prices = shakes.map((item) => {
      const sizeGroup = (item.modifiers || []).find((g) => (g.name || '').toLowerCase().includes('size'));
      const sizeOpts = (sizeGroup?.modifiers || []).filter((m) => !m.sold_out);
      const minSizePrice = sizeOpts.length ? Math.min(...sizeOpts.map((o) => o.price || 0)) : 0;
      return (item.price || 0) + minSizePrice;
    });
    return Math.min(...prices).toFixed(2);
  })();

  const countLabel = shakes.length > 0 ? `${totalCount} Flavors` : 'Hand-Spun Shakes';
  const breakdown = [
    regularCount > 0 && `${regularCount} originals`,
    PREMIUM_COUNT > 0 && `${PREMIUM_COUNT} premium bliss`,
    maltCount > 0 && 'malt',
  ].filter(Boolean).join(' · ');

  if (variant === 'strip') {
    return (
      <Link
        to="/milkshakes"
        className="group relative block overflow-hidden rounded-2xl bg-obsidian-roast p-5 sm:p-6 shadow-float"
      >
        <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 90% 15%, rgba(78,227,200,0.18) 0%, transparent 50%), radial-gradient(circle at 10% 90%, rgba(204,51,0,0.18) 0%, transparent 45%)` }} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="text-4xl flex-shrink-0 group-hover:scale-110 transition-transform">🥤</div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-xl sm:text-2xl text-white leading-tight">
              Shake Isle — <span style={{ color: '#4EE3C8' }}>{countLabel}</span>
            </p>
            <p className="text-white/70 text-xs sm:text-sm mt-0.5">
              {breakdown}. Your size &amp; base.{fromPrice ? ` From $${fromPrice}.` : ''}
            </p>
          </div>
          <span className="btn-cherry chrome-hover inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm flex-shrink-0">
            Order Shakes <ArrowRight size={14} />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <section className="py-16 px-4 sm:px-6 fall26-section">
      <div className="max-w-6xl mx-auto">
        <Link
          to="/milkshakes"
          className="group relative block overflow-hidden rounded-3xl bg-obsidian-roast p-8 sm:p-12 shadow-float-lg"
        >
          <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 85% 25%, rgba(78,227,200,0.20) 0%, transparent 55%), radial-gradient(circle at 12% 85%, rgba(204,51,0,0.25) 0%, transparent 50%)` }} />
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
            <div className="flex-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 bg-white/5 border border-white/15 text-[#4EE3C8] px-4 py-2 rounded-full text-xs font-heading uppercase tracking-widest mb-5">
                Hand-Spun Shakes
              </div>
              <h2 className="font-heading leading-none mb-4 whitespace-nowrap">
                <span className="text-4xl sm:text-6xl text-white">SHAKE </span>
                <span className="text-4xl sm:text-6xl" style={{ color: '#4EE3C8' }}>ISLE</span>
              </h2>
              <p className="text-gray-300 text-base mb-1">
                <span className="text-white font-semibold">{shakes.length > 0 ? `${totalCount} flavors` : 'Hand-spun shakes'}</span>, your size, your base.
              </p>
              <p className="text-[#4EE3C8] text-xs font-heading uppercase tracking-widest mb-2">{breakdown}</p>
              <p className="text-gray-400 text-sm mb-6">Pick a flavor, then make it large or small — add another for a twist.</p>
              <div className="inline-flex items-center gap-4 flex-wrap justify-center sm:justify-start">
                <span className="btn-cherry chrome-hover inline-flex items-center gap-2 px-7 py-3.5 text-sm">
                  Explore Shakes <ArrowRight size={16} />
                </span>
                {fromPrice && (
                  <span className="text-gray-400 text-xs font-heading uppercase tracking-widest">from ${fromPrice}</span>
                )}
              </div>
            </div>
            <div className="hidden sm:flex flex-shrink-0 text-6xl gap-3">
              <span className="group-hover:scale-110 transition-transform">🥤</span>
              <span className="group-hover:scale-110 transition-transform delay-75">🍫</span>
              <span className="group-hover:scale-110 transition-transform delay-150">🍓</span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}