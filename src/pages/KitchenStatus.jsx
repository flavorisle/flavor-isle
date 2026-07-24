import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Phone } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import KitchenBusyness from '@/components/KitchenBusyness';

const TIPS = [
  { emoji: '😎', label: 'Not Busy', tip: 'Great time to order — your food will be ready in about 10–15 minutes.' },
  { emoji: '🙂', label: 'A Little Busy', tip: 'Expect around 15–20 minutes. Order ahead and it will be ready when you arrive.' },
  { emoji: '🔥', label: 'Fairly Busy', tip: 'The grill is rolling! Plan on 20–30 minutes before pickup.' },
  { emoji: '🚨', label: 'Very Busy', tip: 'Peak rush — give us 30–45 minutes, or order now for a later pickup.' },
];

export default function KitchenStatus() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2 text-center">Live from the Grill</p>
        <h1 className="font-heading text-5xl text-obsidian-roast mb-3 text-center">Kitchen Status</h1>
        <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
          See how busy our kitchen is right now and pick the perfect time to place your pickup order. Updates in real time.
        </p>

        {/* Live busyness panel (dark card) */}
        <div className="bg-obsidian-roast rounded-3xl p-6 md:p-8 shadow-float-lg mb-10">
          <h2 className="font-heading text-lg text-white mb-1">Right Now</h2>
          <KitchenBusyness />
        </div>

        {/* Wait time guide */}
        <h2 className="font-heading text-2xl text-obsidian-roast mb-4">What the Levels Mean</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {TIPS.map(t => (
            <div key={t.label} className="card-diner p-5 flex items-start gap-3">
              <span className="text-2xl leading-none">{t.emoji}</span>
              <div>
                <p className="font-heading text-sm text-obsidian-roast mb-1">{t.label}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">{t.tip}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="card-diner p-8 text-center">
          <Clock size={28} className="text-midnight-cherry mx-auto mb-3" />
          <h2 className="font-heading text-xl text-obsidian-roast mb-2">Ready When You Are</h2>
          <p className="text-muted-foreground text-sm mb-6">Order ahead and your food will be hot and waiting at pickup.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/menu" className="btn-cherry chrome-hover px-8 py-3.5 text-sm font-heading">Order Now</Link>
            <a href="tel:+12705634618" className="btn-mint chrome-hover px-8 py-3.5 text-sm font-heading flex items-center justify-center gap-2">
              <Phone size={15} /> Call (270) 563-4618
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}