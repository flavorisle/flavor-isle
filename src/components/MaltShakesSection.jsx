import React from 'react';
import { ArrowRight } from 'lucide-react';
import { flavorNameFromItem, flavorEmojiByName } from '@/lib/shakeConfig';

// Dedicated section for the malt milkshake on the Shake Isle page. Shows a
// single centered malt tile above a short explainer of what a malt is.
export default function MaltShakesSection({ maltShakes, getFromPrice, onSelect }) {
  if (!maltShakes || maltShakes.length === 0) return null;
  const shake = maltShakes[0];
  const name = flavorNameFromItem(shake.name);
  const emoji = flavorEmojiByName(name);

  return (
    <section className="py-16 px-4 sm:px-6 bg-obsidian-roast">
      <div className="max-w-3xl mx-auto">
        {/* Single centered malt tile */}
        <div className="flex justify-center mb-10">
          <button
            onClick={() => onSelect(shake)}
            className="card-diner p-6 text-center group flex flex-col items-center justify-center w-full max-w-xs"
          >
            <span className="text-5xl mb-2 group-hover:scale-110 transition-transform">{emoji}</span>
            <p className="font-heading text-obsidian-roast text-lg leading-tight">{name}</p>
            <p className="text-xs text-muted-foreground mt-1.5">from ${getFromPrice(shake)}</p>
            <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-heading text-midnight-cherry opacity-0 group-hover:opacity-100 transition-opacity">
              Customize <ArrowRight size={12} />
            </span>
          </button>
        </div>

        {/* Explainer */}
        <p className="text-patina-mint font-heading text-xs uppercase tracking-widest mb-2 text-center">Malt Syrup Blended In</p>
        <h2 className="font-heading text-3xl sm:text-4xl text-white mb-6 leading-tight text-center">
          What a Malt Milkshake Is at Flavor Isle
        </h2>
        <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
          <p>A malt is a milkshake with malt syrup blended in.</p>
          <p>That syrup gives your shake a richer, deeper, slightly toasty flavor that makes the whole thing taste more bold and satisfying.</p>
          <p>It&rsquo;s still the same cold, creamy Flavor Isle shake &mdash; just with an extra layer of flavor that hits different.</p>
          <p>No powder. No chalky taste. Just real malt syrup mixed smooth into your shake.</p>
        </div>
      </div>
    </section>
  );
}