import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Sparkles } from 'lucide-react';

const CARDS = [
  { icon: '🥩', title: 'Fresh Every Day', body: "We never freeze our beef. Every patty is hand-patted fresh before it hits the grill — real quality in every bite." },
  { icon: '🧑‍🍳', title: 'Made to Order', body: "Nothing sits under a heat lamp here. Your food is cooked fresh when you order it — every single time." },
  { icon: '❤️', title: 'Community Roots', body: "A neighborhood burger restaurant that knows its regulars by name — good food, fair prices, friendly faces." },
  { icon: '⚡', title: 'Hot & Fast', body: "Order online, pick up in minutes. We don't make you wait — we make you hungry." },
  { icon: '🤝', title: 'Support Local', body: "When you order direct, every dollar stays right here in Smiths Grove." },
];

export default function WhyFlavorIsle() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-background fall26-section">
      <div className="text-center mb-12">
        <p className="font-heading uppercase tracking-widest text-sm mb-3" style={{ color: '#d36a44' }}>
          Why Flavor Isle?
        </p>
        <h2 className="font-heading uppercase text-4xl sm:text-5xl leading-tight text-obsidian-roast">
          Made Different. Tasted Better.
        </h2>
        <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
          We love seeing you walk through the door.
        </p>
      </div>
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CARDS.map((c) => (
            <div key={c.title} className="bg-card rounded-2xl p-6 shadow-float flex items-start gap-4">
              <span className="text-3xl flex-shrink-0" aria-hidden="true">{c.icon}</span>
              <div>
                <h3 className="font-heading uppercase text-xl mb-2 text-obsidian-roast">{c.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{c.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Star Rewards — moved from WhyOrderDirect, unchanged ── */}
        <div className="mt-5 rounded-2xl overflow-hidden shadow-float bg-card">
          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] items-stretch">
            <div className="p-7 sm:p-8">
              <div className="inline-flex items-center gap-2 bg-midnight-cherry/10 text-midnight-cherry rounded-full px-3 py-1 mb-4">
                <Sparkles size={14} />
                <span className="text-xs font-heading tracking-widest uppercase">Star Rewards</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-midnight-cherry/10 flex items-center justify-center flex-shrink-0">
                  <Star size={22} className="text-midnight-cherry" />
                </div>
                <h3 className="font-heading uppercase text-xl text-obsidian-roast">
                  Earn Loyalty Rewards
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground mb-5 max-w-md">
                Every direct order earns Flavor Isle loyalty points toward free food — and your first order starts earning right away. Create a free account, order your favorites, and cash points in for shakes, sides, and more. Orders placed through delivery apps don't earn you a thing.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm font-heading">
                  Start Your First Order <ArrowRight size={16} />
                </Link>
                <Link to="/rewards" className="btn-mint inline-flex items-center px-6 py-3 text-sm font-heading">
                  See How Rewards Work
                </Link>
              </div>
            </div>
            <div className="hidden md:block bg-gradient-to-br from-midnight-cherry to-red-900 p-8 text-white">
              <div className="h-full flex flex-col justify-center">
                <div className="text-5xl mb-3">🎁</div>
                <p className="font-heading text-2xl leading-tight">Earn points.</p>
                <p className="font-heading text-2xl leading-tight mb-3">Eat for free.</p>
                <ul className="space-y-2 text-sm text-white/90 font-body">
                  <li>✅ Points on every order</li>
                  <li>✅ Redeem for shakes, sides & more</li>
                  <li>✅ Free to join — no coupon needed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}