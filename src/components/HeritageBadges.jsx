import React from 'react';
import { Beef, IceCream2, MapPin } from 'lucide-react';

const BADGES = [
  { icon: Beef, title: 'Hand-Smashed Kentucky Beef', desc: 'Fresh, never frozen' },
  { icon: IceCream2, title: 'Real Ice Cream Shakes', desc: 'Hand-dipped, spun thick' },
  { icon: MapPin, title: 'Smiths Grove Heritage', desc: 'Proudly serving Warren County and I-65 travelers' },
];

// Compact 3-card trust section shown below the ordering CTAs on the homepage.
export default function HeritageBadges() {
  return (
    <section className="py-12 px-4 sm:px-6 bg-vanilla-malt">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
        {BADGES.map(b => (
          <div key={b.title} className="card-diner p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-midnight-cherry/10 flex items-center justify-center mx-auto mb-3">
              <b.icon size={22} className="text-midnight-cherry" />
            </div>
            <h3 className="font-heading text-base text-obsidian-roast leading-tight">{b.title}</h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-snug">{b.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}