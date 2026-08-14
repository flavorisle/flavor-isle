import React from 'react';
import { ArrowRight } from 'lucide-react';
import { flavorNameFromItem, flavorEmojiByName } from '@/lib/shakeConfig';

// Dedicated section for malt milkshakes on the Shake Isle page. Separates
// the malted shake(s) from the core flavor grid and explains what a malt is.
export default function MaltShakesSection({ maltShakes, getFromPrice, onSelect }) {
  if (!maltShakes || maltShakes.length === 0) return null;
  return (
    <section className="py-16 px-4 sm:px-6 bg-obsidian-roast">
      <div className="max-w-5xl mx-auto">
        <p className="text-patina-mint font-heading text-xs uppercase tracking-widest mb-2">Malt Syrup Blended In</p>
        <h2 className="font-heading text-3xl sm:text-4xl text-white mb-6 leading-tight">
          What a Malt Milkshake Is at Flavor Isle
        </h2>
        <div className="space-y-4 text-gray-300 text-sm leading-relaxed max-w-2xl mb-10">
          <p>A malt is a milkshake with malt syrup blended in.</p>
          <p>That syrup gives your shake a richer, deeper, slightly toasty flavor that makes the whole thing taste more bold and satisfying.</p>
          <p>It&rsquo;s still the same cold, creamy Flavor Isle shake &mdash; just with an extra layer of flavor that hits different.</p>
          <p>No powder. No chalky taste. Just real malt syrup mixed smooth into your shake.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {maltShakes.map((shake) => {
            const name = flavorNameFromItem(shake.name);
            const emoji = flavorEmojiByName(name);
            return (
              <button
                key={shake.id}
                onClick={() => onSelect(shake)}
                className="card-diner p-5 text-center group flex flex-col items-center justify-center min-h-[140px]"
              >
                <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">{emoji}</span>
                <p className="font-heading text-obsidian-roast text-base leading-tight">{name}</p>
                <p className="text-xs text-muted-foreground mt-1.5">from ${getFromPrice(shake)}</p>
                <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-heading text-midnight-cherry opacity-0 group-hover:opacity-100 transition-opacity">
                  Customize <ArrowRight size={12} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}