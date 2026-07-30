import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function LoyaltyFirstOrderBanner() {
  return (
    <section className="px-4 sm:px-6 py-14" style={{ background: '#0B355A' }}>
      <div className="max-w-5xl mx-auto rounded-3xl bg-white shadow-float-lg overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] items-stretch">
          <div className="p-8 sm:p-10">
            <div className="inline-flex items-center gap-2 bg-midnight-cherry/10 text-midnight-cherry rounded-full px-3 py-1 mb-4">
              <Sparkles size={14} />
              <span className="text-xs font-heading tracking-widest uppercase">Star Rewards</span>
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast mb-3 leading-tight">
              Your first order starts earning rewards.
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base mb-6 max-w-md">
              Create a free account, order your favorites, and rack up points on every order — then cash them in for
              shakes, sides, and more. No app or coupon required.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm">
                Start Your First Order <ArrowRight size={16} />
              </Link>
              <Link to="/account" className="btn-mint inline-flex items-center px-6 py-3 text-sm">
                See How Rewards Work
              </Link>
            </div>
          </div>
          <div className="hidden md:block bg-gradient-to-br from-midnight-cherry to-red-900 p-8 text-white">
            <div className="h-full flex flex-col justify-center">
              <div className="text-6xl mb-3">🎁</div>
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
    </section>
  );
}