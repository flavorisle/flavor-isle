import React from 'react';
import { Beef, Flame, HeartHandshake, Milk } from 'lucide-react';

const VALUES = [
  { icon: Beef, title: 'Fresh, Never Frozen', body: 'Our beef arrives fresh and gets hand-patted in our kitchen every morning. No freezer, no shortcuts, no exceptions.' },
  { icon: Flame, title: 'Made When You Order', body: 'Nothing waits under a heat lamp. Your burger hits the grill the moment your ticket prints, and your fries come out of the fryer hot.' },
  { icon: Milk, title: 'Hand-Spun Shakes', body: 'Real ice cream, spun one at a time. Sixteen original flavors, five premium legends, or build your own from scratch.' },
  { icon: HeartHandshake, title: 'Neighbors First', body: "We know our regulars by name and their orders by heart. Fair prices, friendly faces, and a seat for everyone." },
];

export default function AboutValues() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-obsidian-roast text-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="font-heading uppercase tracking-widest text-sm text-smashie-yellow mb-3">What We Stand For</p>
          <h2 className="font-heading uppercase text-4xl sm:text-5xl leading-tight">
            Made Different. Tasted Better.
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {VALUES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-white/5 border border-white/10 rounded-3xl p-7">
              <div className="w-12 h-12 rounded-2xl bg-midnight-cherry flex items-center justify-center mb-5">
                <Icon size={22} className="text-white" />
              </div>
              <h3 className="font-heading uppercase text-xl mb-2">{title}</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}