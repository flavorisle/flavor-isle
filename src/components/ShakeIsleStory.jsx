import React from 'react';

// Story / brand block shown at the bottom of the Shake Isle (Milkshakes)
// page. Purely editorial copy — no interactive elements.
export default function ShakeIsleStory() {
  return (
    <section className="px-4 sm:px-6 py-16" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <div className="max-w-3xl mx-auto space-y-12">
        {/* Hand-Spun Shakes */}
        <div>
          <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast mb-4 leading-none">
            HAND-SPUN SHAKES
          </h2>
          <p className="text-obsidian-roast text-base mb-4 leading-relaxed">
            When a shake is hand-spun, you taste the difference.
          </p>
          <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
            Choose from seventeen original flavors. Five premium legends. Or build your own masterpiece from scratch — it's your craving.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Every swirl hits cold, creamy, and crazy satisfying.
          </p>
        </div>

        <div className="h-px bg-border" />

        {/* Shake Isle */}
        <div>
          <h2 className="font-heading text-3xl sm:text-4xl mb-4 leading-none" style={{ color: '#4EE3C8' }}>
            SHAKE ISLE
          </h2>
          <p className="text-obsidian-roast text-base mb-3 leading-relaxed">
            Pick your size. Pick your flavor. Pick your ice cream base.
          </p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Then hit it with another flavor for a twist that makes it yours and only yours.
          </p>
        </div>

        <div className="h-px bg-border" />

        {/* Make it irresistible */}
        <div>
          <h3 className="font-heading text-2xl sm:text-3xl text-midnight-cherry mb-4 leading-none">
            Make it irresistible
          </h3>
          <p className="text-obsidian-roast text-base mb-3 leading-relaxed">
            Because this isn't just a shake — it's your flex.
          </p>
          <p className="text-muted-foreground text-sm mb-3 leading-relaxed">
            Classic chocolate, strawberry, banana pudding bliss, or a wild double-flavor combo…
          </p>
          <p className="font-heading text-lg text-obsidian-roast leading-snug">
            Flavor Isle is where cravings get crowned. <span className="text-midnight-cherry">They Not Like Us.</span>
          </p>
        </div>
      </div>
    </section>
  );
}