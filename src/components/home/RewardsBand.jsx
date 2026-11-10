import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';

// Compact Star Rewards band. It replaces the tall "Why Flavor Isle" card grid
// on the home page: one navy strip that says what the program gives and sends
// people to the rewards page, instead of a second full section.
export default function RewardsBand() {
  return (
    <section className="bg-patina-mint text-white px-4 sm:px-6 py-10 fall26-section" aria-labelledby="rewards-band-heading">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-10">
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-smashie-yellow flex items-center justify-center">
            <Star size={26} className="text-patina-mint fill-patina-mint" aria-hidden="true" />
          </div>
          <div>
            <p className="font-heading uppercase tracking-widest text-xs text-smashie-yellow">Star Rewards</p>
            <h2 id="rewards-band-heading" className="font-heading text-2xl sm:text-3xl leading-tight">
              Every order earns Stars
            </h2>
          </div>
        </div>

        <p className="text-[15px] text-white/90 leading-relaxed flex-1">
          Order online and collect Stars toward free food — and your second online order scores 50 bonus Stars.
        </p>

        <Link
          to="/rewards"
          className="inline-flex items-center gap-2 min-h-12 px-6 py-3 rounded-full bg-white text-patina-mint font-heading text-sm hover:bg-vanilla-malt transition-colors flex-shrink-0"
        >
          See Star Rewards <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}