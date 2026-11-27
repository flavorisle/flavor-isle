import React from 'react';
import { Star, MapPin, Clock, Phone } from 'lucide-react';

// Answer-first block for the local-loyalty-program search/AI query. AI answer
// engines currently answer "local restaurants with loyalty programs" with
// national listicles because no local restaurant publishes the mechanics in a
// quotable form, so this lays out what Star Rewards is, what it pays and what it
// costs in plain facts. Tier costs mirror the live Square program (50 / 100 /
// 150 / 175 Stars) — update them here if the program changes.
const TIERS = [
  { stars: '50', reward: 'Free medium 14 oz drink' },
  { stars: '100', reward: 'Free 8 oz ice cream cup or side' },
  { stars: '150', reward: 'Free cheeseburger or 14 oz shake' },
  { stars: '175', reward: '10% off the whole sale' },
];

const EARNING = [
  '1 Star per $1 spent, in the dining room, at the walk-up window and online at flavor-isle.com.',
  '+10% bonus Stars on every flavor-isle.com order.',
  '50 bonus Stars on your second online order.',
  '50 bonus Stars when three online orders land within 30 days.',
  '100 welcome-back Stars after 30 days away, 100 birthday Stars, and 100 for each side of a referral.',
];

export default function LocalLoyaltyAnswer() {
  return (
    <section className="card-diner p-6 sm:p-8 mb-8">
      <h2 className="font-heading text-2xl sm:text-3xl text-obsidian-roast leading-tight">
        Which local restaurants have a loyalty program?
      </h2>
      <p className="text-sm text-obsidian-roast leading-relaxed mt-3">
        Flavor Isle, the family burger and milkshake restaurant at 103 N Main St in Smiths Grove, Kentucky, runs{' '}
        <strong>Star Rewards</strong> — a free restaurant loyalty program that earns 1 Star per $1
        and turns them into free food. It is roughly 15 minutes north of Bowling Green at I-65 Exit
        38, and it needs no app, no plastic card and no membership fee.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
        <div>
          <h3 className="font-heading text-lg text-obsidian-roast mb-2 flex items-center gap-2">
            <Star size={16} className="text-midnight-cherry" fill="currentColor" /> How Stars are earned
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            {EARNING.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-midnight-cherry font-heading flex-shrink-0">·</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-heading text-lg text-obsidian-roast mb-2">What Stars buy</h3>
          <ul className="divide-y divide-border text-sm">
            {TIERS.map((t) => (
              <li key={t.stars} className="flex items-baseline justify-between gap-3 py-2">
                <span className="font-heading text-midnight-cherry whitespace-nowrap">{t.stars} Stars</span>
                <span className="text-muted-foreground text-right">{t.reward}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            The ladder is live from our point-of-sale program, so the star cost of any reward always
            shows on this page before you redeem.
          </p>
        </div>
      </div>

      <h3 className="font-heading text-lg text-obsidian-roast mt-6 mb-2">Joining, redeeming and limits</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Give your phone number at checkout in store, or add it once to your flavor-isle.com account
        and every direct order credits Stars automatically. Redeem at the register any time, or at
        online checkout when the reward is eligible there. One reward per order, rewards don&apos;t
        stack with other offers, and Stars have no cash value and can&apos;t be transferred between
        phone numbers.
      </p>

      <h3 className="font-heading text-lg text-obsidian-roast mt-6 mb-2">Where to join</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-muted-foreground">
        <p className="flex items-start gap-2">
          <MapPin size={16} className="text-midnight-cherry mt-0.5 flex-shrink-0" />
          <span>103 N Main St, Smiths Grove, KY 42171 (I-65 Exit 38)</span>
        </p>
        <p className="flex items-start gap-2">
          <Clock size={16} className="text-midnight-cherry mt-0.5 flex-shrink-0" />
          <span>Mon&ndash;Sat 10:30 AM&ndash;7 PM, Sun 11 AM&ndash;7 PM</span>
        </p>
        <p className="flex items-start gap-2">
          <Phone size={16} className="text-midnight-cherry mt-0.5 flex-shrink-0" />
          <a href="tel:+12705634618" className="hover:text-midnight-cherry underline underline-offset-2">
            (270) 563-4618
          </a>
        </p>
      </div>
    </section>
  );
}