import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Sparkles } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useCart } from '@/context/CartContext';
import { base44 } from '@/api/base44Client';

const SHAKE_FLAVORS = [
  { name: 'Vanilla Malt', desc: 'Classic soft-serve blended with real malt powder. Creamy, dreamy, timeless.', emoji: '🤍', color: 'from-yellow-50 to-amber-100', tag: 'Classic' },
  { name: 'Chocolate Fudge', desc: 'Rich dark chocolate ice cream, thick fudge swirl. Pure indulgence in a cup.', emoji: '🍫', color: 'from-amber-800/20 to-stone-200', tag: 'Fan Fave' },
  { name: 'Strawberry', desc: 'Fresh strawberry blended with real ice cream. Sweet, fruity, and totally refreshing.', emoji: '🍓', color: 'from-pink-100 to-rose-100', tag: 'Fresh' },
  { name: 'Banana', desc: 'Ripe banana blended smooth with creamy vanilla. A diner throwback that never gets old.', emoji: '🍌', color: 'from-yellow-100 to-yellow-200', tag: 'Throwback' },
  { name: 'Mint Chocolate Chip', desc: 'Cool mint meets rich chocolate chips. Refreshing and indulgent at the same time.', emoji: '🌿', color: 'from-green-100 to-emerald-100', tag: 'Refreshing' },
  { name: 'Hot Fudge Sundae Shake', desc: 'Shake meets sundae. Vanilla base, hot fudge, whipped cream, cherry on top.', emoji: '🍒', color: 'from-red-100 to-rose-200', tag: 'Signature' },
];

const FACTS = [
  { icon: '🥛', title: 'Real Ice Cream Only', desc: 'We never use soft-serve mix. Every shake starts with scoops of real ice cream.' },
  { icon: '⚡', title: 'Blended to Order', desc: 'Each shake is made fresh when you order — no sitting around getting watery.' },
  { icon: '🥄', title: 'Thick Enough to Stand a Spoon', desc: "If a spoon won't stand up in it, we start over. That's the Flavor Isle standard." },
  { icon: '🏆', title: 'Award-Winning Malts', desc: 'Our malts have been called the best in Warren County. We take that seriously.' },
];

export default function Milkshakes() {
  const { addItem, setIsCartOpen } = useCart();
  const [shakeItems, setShakeItems] = useState([]);

  useEffect(() => {
    base44.entities.MenuItem.filter({ category: 'Shakes', is_available: true }).then(setShakeItems).catch(() => {});
  }, []);

  const handleAdd = (item) => {
    addItem(item);
    setIsCartOpen(true);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      {/* Hero */}
      <section className="relative overflow-hidden bg-obsidian-roast py-24 px-4 sm:px-6">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, #C0392B 0%, transparent 50%), radial-gradient(circle at 80% 50%, #1A3A5C 0%, transparent 50%)`
        }} />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="text-8xl mb-6 animate-bounce">🥤</div>
          <div className="inline-flex items-center gap-2 bg-midnight-cherry/20 border border-midnight-cherry/40 text-red-300 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            <Sparkles size={14} />
            Blended Fresh Every Time
          </div>
          <h1 className="font-heading text-5xl sm:text-7xl text-white mb-6 leading-tight">
            SHAKES &<br />
            <span style={{ color: '#FF6B6B' }}>MALTS</span>
          </h1>
          <p className="text-gray-300 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Thick, creamy, made with real ice cream. The kind of shake that makes you slow down and actually enjoy it.
          </p>
          <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-8 py-4 font-heading text-sm">
            Order a Shake Now <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Facts */}
      <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {FACTS.map(f => (
            <div key={f.title} className="card-diner p-6 text-center">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-heading text-sm text-obsidian-roast mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Flavor Showcase */}
      <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">The Lineup</p>
          <h2 className="font-heading text-4xl text-obsidian-roast">Our Shake Flavors</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SHAKE_FLAVORS.map(flavor => (
            <div key={flavor.name} className={`card-diner p-7 bg-gradient-to-br ${flavor.color} border border-white/60`}>
              <div className="flex items-start justify-between mb-4">
                <div className="text-5xl">{flavor.emoji}</div>
                <span className="bg-white/80 text-obsidian-roast text-xs font-heading px-3 py-1 rounded-full">{flavor.tag}</span>
              </div>
              <h3 className="font-heading text-xl text-obsidian-roast mb-2">{flavor.name}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{flavor.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Live menu items */}
      {shakeItems.length > 0 && (
        <section className="py-16 bg-obsidian-roast px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">Order Now</p>
              <h2 className="font-heading text-4xl text-white">From the Menu</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {shakeItems.map(item => (
                <div key={item.id} className="bg-white/5 border border-white/10 rounded-3xl p-5 flex gap-4 hover:border-midnight-cherry/40 transition-all">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.name} className="w-20 h-20 object-cover rounded-2xl flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-heading text-white text-sm mb-1">{item.name}</h3>
                    <p className="text-gray-400 text-xs mb-3 leading-relaxed line-clamp-2">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-midnight-cherry font-heading">${item.price?.toFixed(2)}</span>
                      <button
                        onClick={() => handleAdd(item)}
                        className="btn-cherry px-3 py-1.5 text-xs"
                      >
                        Add to Order
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-midnight-cherry">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-4xl text-white mb-4">Life's Too Short for Bad Shakes.</h2>
          <p className="text-red-200 mb-8">Come see why people drive from all over Warren County just for one of ours.</p>
          <Link to="/menu" className="bg-white text-midnight-cherry font-heading px-8 py-4 rounded-2xl hover:bg-vanilla-malt transition-colors chrome-hover inline-flex items-center gap-2">
            Order Your Shake <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}