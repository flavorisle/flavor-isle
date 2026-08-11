<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ShakeCustomizer, { MILKSHAKE_ITEM_ID, SHAKE_SIZE_PRICES } from '@/components/ShakeCustomizer';
import { useCart } from '@/context/CartContext';
import { base44 } from '@/api/base44Client';
import { getShakeConfig, resolveFlavorName, resolveFlavorEmoji } from '@/lib/shakeConfig';

// The Milkshakes page now lists every flavor from the single Square
// "Milkshake" item as its own card. Tapping a card opens the ShakeCustomizer
// where the customer picks size, consistency, extra flavors, and toppings.
export default function Milkshakes() {
  const { setIsCartOpen } = useCart();
  const [shakeItem, setShakeItem] = useState(null);
  const [config, setConfig] = useState(getShakeConfig());
  const [loading, setLoading] = useState(true);
  const [activeFlavor, setActiveFlavor] = useState(null);

  useEffect(() => {
    base44.entities.MenuItem
      .get(MILKSHAKE_ITEM_ID)
      .then((it) => setShakeItem(it))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const flavors = (shakeItem?.modifiers || [])
    .find((g) => (g.name || '').toLowerCase().includes('flavor'))
    ?.modifiers.filter((m) => !m.sold_out) || [];

  const fromPrice = SHAKE_SIZE_PRICES.small.toFixed(2);

  const openCustomizer = (flavor) => setActiveFlavor(flavor);
  const closeCustomizer = () => setActiveFlavor(null);

=======
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

export default function Milkshakes() {
>>>>>>> d870ddffc07c0bbf3214ab3fafa4a793a148216f
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

<<<<<<< HEAD
      {/* Hero */}
      <section className="relative overflow-hidden bg-obsidian-roast px-4 sm:px-6 pt-20 pb-16 text-center">
=======
      <section className="relative overflow-hidden bg-obsidian-roast flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center py-24">
>>>>>>> d870ddffc07c0bbf3214ab3fafa4a793a148216f
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 15% 50%, rgba(204,51,0,0.3) 0%, transparent 50%), radial-gradient(circle at 85% 30%, rgba(0,51,102,0.4) 0%, transparent 50%)`
        }} />
<<<<<<< HEAD
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-midnight-cherry/20 border border-midnight-cherry/40 text-red-300 px-4 py-2 rounded-full text-xs font-heading uppercase tracking-widest mb-8">
            Hand-Spun Shakes
          </div>
          <h1 className="font-heading leading-none mb-4">
            <span className="block text-6xl sm:text-8xl text-white">SHAKE</span>
            <span className="block text-6xl sm:text-8xl" style={{ color: '#4EE3C8' }}>ISLE</span>
          </h1>
          <p className="text-gray-300 text-lg mb-3">
            <span className="text-white font-semibold">{flavors.length} flavors</span>, your size, your consistency.
          </p>
          <p className="text-gray-400 text-sm mb-8">
            Pick a flavor, then make it large or small, thin or thick — add another flavor for a twist.
          </p>
          <div className="inline-flex items-center gap-2 text-gray-400 text-xs font-heading uppercase tracking-widest">
            <span>from ${fromPrice}</span>
            <span className="text-gray-600">•</span>
            <span>Scroll to explore</span>
          </div>
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
          ) : flavors.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="font-heading">No flavors available right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {flavors.map((flavor) => {
                const name = resolveFlavorName(flavor.id, flavor.name, config);
                const emoji = resolveFlavorEmoji(flavor.id, config);
                return (
                  <button
                    key={flavor.id}
                    onClick={() => openCustomizer(flavor)}
                    className="card-diner p-5 text-center group flex flex-col items-center justify-center min-h-[140px]"
                  >
                    <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">{emoji}</span>
                    <p className="font-heading text-obsidian-roast text-base leading-tight">{name}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">from ${fromPrice}</p>
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

      {/* CTA */}
      <section className="py-16 px-4 sm:px-6 bg-obsidian-roast">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl text-white mb-4 leading-tight">
            Your shake.<br /><span style={{ color: '#4EE3C8' }}>Your way.</span>
          </h2>
          <p className="text-gray-400 mb-8 text-sm leading-relaxed">
            Small or large. Thin, regular, or thick. One flavor or three.<br />
            <span className="text-white font-semibold">Mix it however you like.</span>
          </p>
          <button
            onClick={() => setIsCartOpen(true)}
            className="btn-cherry chrome-hover inline-flex items-center gap-2 px-8 py-4 font-heading text-sm"
          >
            <ShoppingBag size={16} /> View Cart
          </button>
=======

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-smashie-yellow/20 border border-smashie-yellow/40 text-smashie-yellow px-4 py-2 rounded-full text-xs font-heading uppercase tracking-widest mb-8">
            Coming Soon
          </div>

          <h1 className="font-heading leading-none mb-6">
            <span className="block text-7xl sm:text-9xl text-white">SHAKE</span>
            <span className="block text-7xl sm:text-9xl" style={{ color: '#4EE3C8' }}>ISLE</span>
          </h1>

          <p className="text-gray-300 text-lg mb-3 leading-relaxed">
            The <span className="text-white font-semibold">Build Your Own Shake</span> experience is on its way.
          </p>
          <p className="text-gray-400 text-base mb-12 max-w-xl mx-auto">
            Your rules. Your flavors. Your masterpiece. We're putting the finishing touches on something special — check back soon.
          </p>

          <Link
            to="/menu"
            className="btn-cherry chrome-hover inline-flex items-center gap-3 px-10 py-5 font-heading text-base"
          >
            Browse the Menu <ArrowRight size={18} />
          </Link>
>>>>>>> d870ddffc07c0bbf3214ab3fafa4a793a148216f
        </div>
      </section>

      <Footer />

      <ShakeCustomizer
        open={!!activeFlavor}
        onClose={closeCustomizer}
        primaryFlavor={activeFlavor}
        shakeItem={shakeItem}
        config={config}
      />
    </div>
  );
}