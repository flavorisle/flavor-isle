import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Tag, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const LINK_OPTIONS = [
  { value: '/menu', label: 'Order / Menu' },
  { value: '/milkshakes', label: 'Milkshakes' },
  { value: '/contact', label: 'Contact' },
];

function linkDisplay(path) {
  return LINK_OPTIONS.find((o) => o.value === path)?.label || 'Visit';
}

export default function PromosSection() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await base44.entities.Promo.list('sort_order', 100);
        if (mounted) setPromos((data || []).filter((p) => p.is_active));
      } catch (e) {
        console.error('Failed to load promos', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const featured = promos.find((p) => p.featured && p.is_active);

  return (
    <section className="py-16 px-4 sm:px-6 bg-patina-mint/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-midnight-cherry/20 border border-midnight-cherry/40 text-midnight-cherry px-4 py-2 rounded-full text-xs font-heading uppercase tracking-widest mb-3">
            <Tag size={14} /> Deals & Specials
          </div>
          <h2 className="font-heading text-4xl text-obsidian-roast">Current Promotions</h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">We believe good food should be affordable. Here's what we've got going right now.</p>
        </div>

        {/* Featured banner */}
        {featured && (
          <div className="bg-midnight-cherry rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-float-lg mb-8">
            <div className="text-center sm:text-left">
              <div className="inline-flex items-center gap-2 bg-white/20 text-white px-3 py-1 rounded-full text-xs font-heading uppercase tracking-widest mb-3">
                <Zap size={12} /> {featured.badge || 'Featured Deal'}
              </div>
              <h3 className="font-heading text-3xl sm:text-4xl text-white mb-2">{featured.title}</h3>
              <p className="text-red-200 max-w-md">{featured.description}</p>
            </div>
            <div className="flex-shrink-0">
              <div className="text-center bg-white/10 border-2 border-white/30 rounded-2xl px-10 py-6">
                <div className="text-6xl mb-1">{featured.emoji || '🎁'}</div>
                <p className="font-heading text-white text-lg">{featured.badge || 'Limited Time'}</p>
                {featured.detail && <p className="text-red-200 text-xs">{featured.detail}</p>}
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading deals…</div>
        ) : promos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-5xl mb-3">🎁</div>
            No promos are running right now — check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {promos.map((promo) => (
              <div key={promo.id} className="card-diner p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="text-4xl">{promo.emoji || '🎁'}</div>
                  {promo.badge && (
                    <span className={`${promo.badge_color || 'bg-midnight-cherry'} text-white text-xs font-heading px-3 py-1 rounded-full`}>{promo.badge}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-heading text-obsidian-roast text-lg mb-2">{promo.title}</h3>
                  {promo.description && <p className="text-muted-foreground text-sm leading-relaxed">{promo.description}</p>}
                </div>
                {promo.detail && (
                  <>
                    <button
                      onClick={() => setExpandedId(expandedId === promo.id ? null : promo.id)}
                      className="text-patina-mint text-xs font-semibold hover:underline text-left"
                    >
                      {expandedId === promo.id ? 'Hide details ▲' : 'See details ▼'}
                    </button>
                    {expandedId === promo.id && (
                      <p className="text-xs text-muted-foreground bg-muted rounded-xl px-3 py-2">{promo.detail}</p>
                    )}
                  </>
                )}
                <div className="mt-auto">
                  <Link to={promo.cta_link || '/menu'} className="btn-cherry chrome-hover w-full py-2.5 text-sm font-heading flex items-center justify-center gap-2">
                    {promo.cta_label || linkDisplay(promo.cta_link)} <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}