import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, UtensilsCrossed, Landmark, Users, Star, Sun } from 'lucide-react';

const PILLARS = [
  {
    icon: UtensilsCrossed,
    title: 'Friendly Service',
    text: 'Whether you order from our walk-up window, inside our small dining room, online or by phone, our team is ready to serve you.',
  },
  {
    icon: Landmark,
    title: 'Authentic Heritage',
    text: 'A menu rooted in the originals that made Flavor Isle famous.',
  },
  {
    icon: Users,
    title: 'Community Energy',
    text: 'Families, friends, and neighbors gathering under the string lights.',
  },
  {
    icon: Star,
    title: 'Signature Items',
    text: 'From Double Bacon Cheeseburgers, beer battered onion rings and hand-spun curly fries to Banana Pudding Bliss Milkshakes, the favorites never miss.',
  },
  {
    icon: Sun,
    title: 'Outdoor Vibe',
    text: 'Picnic tables, friendly service, and a casual atmosphere that’s pure Smiths Grove.',
  },
];

// "What to expect" and the Flavor Isle promise, brought over from the old
// visit-us page so the story sits in the same place as the directions.
export default function WhatToExpect() {
  return (
    <section id="what-to-expect" className="bg-white border-y border-border scroll-mt-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center mb-8">
          <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">What to Expect</h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Whether you’re grabbing a quick bite or kicking back with friends, Flavor Isle serves up hand-patted burgers, craveworthy sides, and cold shakes with real Kentucky flavor. Our outdoor seating is always open, and the energy is always original.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PILLARS.map((p) => (
            <div key={p.title} className="card-diner p-5">
              <div className="w-11 h-11 rounded-full bg-midnight-cherry/10 flex items-center justify-center mb-3">
                <p.icon size={20} className="text-midnight-cherry" />
              </div>
              <h3 className="font-heading text-xl text-obsidian-roast leading-tight">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">{p.text}</p>
            </div>
          ))}
          <div className="card-diner p-5 bg-smashie-yellow/15 flex flex-col justify-center">
            <h3 className="font-heading text-xl text-obsidian-roast leading-tight">The Flavor Isle Promise</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-2">
              Come hungry. Leave hyped. Flavor Isle is more than a meal — it’s a movement.
            </p>
            <Link to="/menu" className="inline-flex items-center gap-1.5 text-sm font-heading text-midnight-cherry hover:text-patina-mint transition-colors mt-3">
              See the menu <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}