import React, { useState, useEffect } from 'react';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ShakeCustomizer from '@/components/ShakeCustomizer';
import PremiumShakesSection from '@/components/PremiumShakesSection';
import MaltShakesSection from '@/components/MaltShakesSection';
import ShakeIsleStory from '@/components/ShakeIsleStory';
import { Link } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { base44 } from '@/api/base44Client';
import { flavorNameFromItem, flavorEmojiByName } from '@/lib/shakeConfig';

// The Milkshakes page lists every individual milkshake item from Square's
// "Whirl & Twirl" category as its own card. Tapping a card opens the
// ShakeCustomizer where the customer picks size, base, and extra flavors.
export default function Milkshakes() {
  const { setIsCartOpen } = useCart();
  const [shakes, setShakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeShake, setActiveShake] = useState(null);

  useEffect(() => {
    base44.entities.MenuItem
      .filter({ square_category: 'Whirl & Twirl', is_hidden: false })
      .then((items) => {
        // Sort alphabetically by name for a consistent display order.
        const sorted = (items || [])
          .filter((i) => i.is_available !== false)
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setShakes(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // "From" price = item base + cheapest size option (if any).
  const getFromPrice = (item) => {
    const sizeGroup = (item.modifiers || []).find((g) => (g.name || '').toLowerCase().includes('size'));
    const sizeOpts = (sizeGroup?.modifiers || []).filter((m) => !m.sold_out);
    const minSizePrice = sizeOpts.length ? Math.min(...sizeOpts.map((o) => o.price || 0)) : 0;
    return ((item.price || 0) + minSizePrice).toFixed(2);
  };

  const openCustomizer = (shake) => setActiveShake(shake);
  const closeCustomizer = () => setActiveShake(null);

  // Malt shakes live in their own section with an explainer, separate from
  // the core flavor grid.
  const maltShakes = shakes.filter((s) => /malt/i.test(s.name || ''));
  const regularShakes = shakes.filter((s) => !/malt/i.test(s.name || ''));

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      {/* Hero */}
      <section className="relative overflow-hidden bg-obsidian-roast px-4 sm:px-6 pt-20 pb-16 text-center">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 15% 50%, rgba(204,51,0,0.3) 0%, transparent 50%), radial-gradient(circle at 85% 30%, rgba(0,51,102,0.4) 0%, transparent 50%)`
        }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/15 text-[#4EE3C8] px-4 py-2 rounded-full text-xs font-heading uppercase tracking-widest mb-8">
            Hand-Spun Shakes
          </div>
          <h1 className="font-heading leading-none mb-4 whitespace-nowrap">
            <span className="text-5xl sm:text-7xl md:text-8xl text-white">SHAKE </span>
            <span className="text-5xl sm:text-7xl md:text-8xl" style={{ color: '#4EE3C8' }}>ISLE</span>
          </h1>
          <p className="text-gray-300 text-lg mb-3">
            <span className="text-white font-semibold">{regularShakes.length} flavors</span>, your size, your base.
          </p>
          <p className="text-gray-400 text-sm mb-8">
            Pick a flavor, then make it large or small — add another flavor for a twist.
          </p>
          <div className="inline-flex items-center gap-2 text-gray-400 text-xs font-heading uppercase tracking-widest">
            <span>from {regularShakes.length > 0 ? `$${getFromPrice(regularShakes[0])}` : '—'}</span>
            <span className="text-gray-600">•</span>
            <span>Scroll to explore</span>
          </div>
          <Link
            to="/menu"
            className="inline-flex items-center gap-1.5 mt-6 text-white/80 hover:text-white text-xs font-heading uppercase tracking-widest transition-colors"
          >
            <ArrowRight size={12} className="rotate-180" /> Back to Menu
          </Link>
        </div>
      </section>

      {/* Flavor grid */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-patina-mint font-heading text-xs uppercase tracking-widest mb-2">Pick Your Flavor</p>
            <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">EVERY SHAKE WE MAKE</h2>
          </div>

          {loading ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
              <p className="font-heading">Loading flavors…</p>
            </div>
          ) : regularShakes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="font-heading">No flavors available right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {regularShakes.map((shake) => {
                const name = flavorNameFromItem(shake.name);
                const emoji = flavorEmojiByName(name);
                return (
                  <button
                    key={shake.id}
                    onClick={() => openCustomizer(shake)}
                    className="card-diner p-5 text-center group flex flex-col items-center justify-center min-h-[140px]"
                  >
                    <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">{emoji}</span>
                    <p className="font-heading text-obsidian-roast text-base leading-tight">{name}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">from ${getFromPrice(shake)}</p>
                    <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-heading text-midnight-cherry opacity-0 group-hover:opacity-100 transition-opacity">
                      Customize <ArrowRight size={12} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Malt Milkshakes */}
      <MaltShakesSection
        maltShakes={maltShakes}
        getFromPrice={getFromPrice}
        onSelect={openCustomizer}
      />

      {/* Premium Bliss Shakes */}
      <section className="py-16 px-4 sm:px-6 bg-gradient-to-b from-vanilla-malt to-amber-50/40">
        <PremiumShakesSection />
      </section>

      {/* CTA — heading */}
      <section className="py-16 px-4 sm:px-6 bg-obsidian-roast">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl text-white leading-tight whitespace-nowrap">
            Your shake. <span style={{ color: '#4EE3C8' }}>Your way.</span>
          </h2>
        </div>
      </section>

      <ShakeIsleStory />

      {/* CTA — closing line + cart */}
      <section className="py-16 px-4 sm:px-6 bg-obsidian-roast">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-400 mb-8 text-sm leading-relaxed">
            Small or large. One flavor or three.<br />
            <span className="text-white font-semibold">Mix it however you like.</span>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setIsCartOpen(true)}
              className="btn-cherry chrome-hover inline-flex items-center gap-2 px-8 py-4 font-heading text-sm"
            >
              <ShoppingBag size={16} /> View Cart
            </button>
            <Link
              to="/menu"
              className="btn-mint chrome-hover inline-flex items-center gap-2 px-8 py-4 font-heading text-sm"
            >
              <ArrowRight size={16} /> Browse Full Menu
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      <ShakeCustomizer
        open={!!activeShake}
        onClose={closeCustomizer}
        shakeItem={activeShake}
      />
    </div>
  );
}