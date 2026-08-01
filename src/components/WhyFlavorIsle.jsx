import React from 'react';

const CARDS = [
  { icon: '🥩', title: 'Fresh Every Day', body: "We never freeze our beef. Every patty is hand-patted fresh before it hits the grill — real quality in every bite." },
  { icon: '🧑‍🍳', title: 'Made to Order', body: "Nothing sits under a heat lamp here. Your food is cooked fresh when you order it — every single time." },
  { icon: '❤️', title: 'Community Roots', body: "A neighborhood burger restaurant that knows its regulars by name — good food, fair prices, friendly faces." },
  { icon: '⚡', title: 'Hot & Fast', body: "Order online, pick up in minutes. We don't make you wait — we make you hungry." },
];

export default function WhyFlavorIsle() {
  return (
    <section className="py-20 px-4 sm:px-6" style={{ background: '#FDF5DA' }}>
      <div className="text-center mb-12">
        <p className="font-heading uppercase tracking-widest text-sm mb-3" style={{ color: '#d36a44' }}>
          Why Flavor Isle?
        </p>
        <h2 className="font-heading uppercase text-4xl sm:text-5xl leading-tight" style={{ color: '#002d5b' }}>
          Made Different. Tasted Better.
        </h2>
      </div>
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5">
        {CARDS.map((c) => (
          <div key={c.title} className="bg-white rounded-2xl p-7 shadow-float">
            <div className="text-3xl mb-3">{c.icon}</div>
            <h3 className="font-heading uppercase text-xl mb-2" style={{ color: '#002d5b' }}>
              {c.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}