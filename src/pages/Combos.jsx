import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ShoppingBag, Package } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import GroupOrderBar from '@/components/GroupOrderBar';
import ComboBuilderSection from '@/components/ComboBuilderSection';
import Seo from '@/components/Seo';

// The combo builder is live for every visitor — web and native app alike. Each
// combo is priced from its ComboConfig (main + side + drink, discount_percent)
// and validated server-side at checkout.
export default function Combos() {
  const navigate = useNavigate();

  const scrollToBuilder = () =>
    document.getElementById('combo-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Seo
        title="Combo Meals — Build Your Burger & Shake Combo | Flavor Isle"
        description="Build your own Isle Combo: pick a hand-patted burger, add crinkle fries and a hand-spun shake, and save. Order combos online for pickup or delivery at Flavor Isle."
      />
      <Navbar />
      <GroupOrderBar />
      <CartDrawer />

      {/* Hero */}
      <section className="relative overflow-hidden bg-obsidian-roast min-h-[70vh] flex flex-col items-center justify-center px-4 sm:px-6 text-center">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(204,51,0,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(0,51,102,0.4) 0%, transparent 55%)`
        }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-smashie-yellow text-obsidian-roast px-5 py-2.5 rounded-full text-xs font-heading uppercase tracking-widest mb-8">
            <Package size={14} /> Build It Now
          </div>
          <h1 className="font-heading text-7xl sm:text-9xl text-white leading-none mb-4">COMBO ISLE</h1>
          <p className="text-gray-300 text-lg mb-2">Pick a main, a side, and a drink.</p>
          <p className="text-gray-400 text-base mb-12">Name it. Stack it.</p>
          <button onClick={scrollToBuilder} className="btn-cherry chrome-hover inline-flex items-center gap-3 px-10 py-5 font-heading text-base">
            Start Building <ArrowDown size={18} />
          </button>
        </div>
      </section>

      <div id="combo-builder">
        <ComboBuilderSection />
      </div>

      <section className="py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-4xl text-obsidian-roast mb-3">Want a specific burger?</h2>
          <p className="text-muted-foreground mb-8">Build the combo on any burger's page — pick your side and drink right there and save.</p>
          <button onClick={() => navigate('/menu')} className="btn-cherry chrome-hover inline-flex items-center gap-2 px-8 py-4 font-heading text-sm">
            <ShoppingBag size={16} /> Order from the Menu
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}