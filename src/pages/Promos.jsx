import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Tag, Zap, CalendarDays } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { base44 } from '@/api/base44Client';

const HOURS = [
  { day: 'Monday – Saturday', hours: '10:30AM – 8PM' },
  { day: 'Sunday', hours: '11AM – 8PM' },
];

const LINK_OPTIONS = [
  { value: '/menu', label: 'Order / Menu' },
  { value: '/milkshakes', label: 'Milkshakes' },
  { value: '/contact', label: 'Contact' },
];

function linkDisplay(path) {
  return LINK_OPTIONS.find(o => o.value === path)?.label || 'Visit';
}

export default function Promos() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await base44.entities.Promo.list('sort_order', 100);
        if (mounted) setPromos((data || []).filter(p => p.is_active));
      } catch (e) {
        console.error('Failed to load promos', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const featured = promos.find(p => p.featured && p.is_active);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      {/* Hero */}
      <section className="relative overflow-hidden bg-obsidian-roast py-24 px-4 sm:px-6 text-center">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 30% 50%, #C0392B 0%, transparent 50%), radial-gradient(circle at 70% 50%, #1A3A5C 0%, transparent 50%)`
        }} />
        <div className="relative max-w-3xl mx-auto">
          <div className="text-7xl mb-6">🎁</div>
          <div className="inline-flex items-center gap-2 bg-midnight-cherry/20 border border-midnight-cherry/40 text-red-300 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Tag size={14} />
            Updated Regularly
          </div>
          <h1 className="font-heading text-5xl sm:text-7xl text-white mb-6">
            DEALS &<br />
            <span style={{ color: '#FF6B6B' }}>SPECIALS</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto">
            We believe good food should be affordable. Check out what we've got going on right now.
          </p>
        </div>
      </section>

      {/* Featured Promo Banner */}
      {featured && (
        <section className="py-10 px-4 sm:px-6 max-w-7xl mx-auto">
          <div className="bg-midnight-cherry rounded-3xl p-8 sm:p-12 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-float-lg">
            <div className="text-center sm:text-left">
              <div className="inline-flex items-center gap-2 bg-white/20 text-white px-3 py-1 rounded-full text-xs font-heading uppercase tracking-widest mb-3">
                <Zap size={12} /> {featured.badge || 'Featured Deal'}
              </div>
              <h2 className="font-heading text-3xl sm:text-4xl text-white mb-2">{featured.title}</h2>
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
        </section>
      )}

      {/* All Promos Grid */}
      <section className="py-10 pb-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">All Offers</p>
          <h2 className="font-heading text-4xl text-obsidian-roast">Current Promotions</h2>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading deals…</div>
        ) : promos.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="text-5xl mb-3">🎁</div>
            No promos are running right now — check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {promos.map(promo => (
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
      </section>

      {/* Hours reminder */}
      <section className="py-16 bg-patina-mint/10 px-4 sm:px-6">
        <div className="max-w-xl mx-auto text-center">
          <CalendarDays size={32} className="mx-auto mb-4 text-patina-mint" />
          <h2 className="font-heading text-2xl text-obsidian-roast mb-4">Come See Us</h2>
          <div className="space-y-2 mb-8">
            {HOURS.map(h => (
              <div key={h.day} className="flex justify-between max-w-xs mx-auto text-sm text-muted-foreground">
                <span>{h.day}</span>
                <span className="font-semibold text-obsidian-roast">{h.hours}</span>
              </div>
            ))}
          </div>
          <Link to="/contact" className="btn-mint chrome-hover inline-flex items-center gap-2 px-7 py-3 text-sm font-heading">
            Get in Touch <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}