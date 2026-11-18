import React from 'react';
import { ruleBadge } from '@/lib/modifierRules';
import { optimizedImageUrl } from '@/lib/utils';

// One food build card: the loaded item's real Square photo and price, the base
// fries it starts from, and every stacked modifier group with its options.
export default function FoodBuildCard({ build }) {
  const { loaded, base, groups } = build;
  const photo = loaded?.image_url_opt || loaded?.image_url || base?.image_url_opt || base?.image_url || '';

  return (
    <article className="card-diner overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-5 p-5">
        {photo ? (
          <img
            src={optimizedImageUrl(photo, 480, 480)}
            alt={build.name}
            width="480"
            height="480"
            loading="lazy"
            decoding="async"
            className="w-full sm:w-44 h-44 object-cover rounded-2xl flex-shrink-0"
          />
        ) : null}

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h3 className="font-heading text-2xl text-obsidian-roast">{build.name}</h3>
            <span className="font-heading text-xl text-midnight-cherry">
              ${(loaded?.price ?? 0).toFixed(2)}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            Starts with {base ? `${base.name} — $${base.price.toFixed(2)}` : 'the base fries'}
            {loaded ? ` · Square item: ${loaded.name}` : ''}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {groups.map((group) => (
              <div key={group.id || group.name} className="bg-muted/60 border border-border rounded-2xl p-3">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <p className="font-heading text-xs uppercase tracking-widest text-obsidian-roast">{group.name}</p>
                  <span className="text-[11px] text-muted-foreground bg-white px-2 py-0.5 rounded-full border border-border">
                    {ruleBadge(group)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(group.modifiers || []).map((option) => (
                    <span
                      key={option.id || option.name}
                      className="bg-white border border-border rounded-xl px-2.5 py-1 text-xs text-obsidian-roast"
                    >
                      {option.name}
                      {option.price > 0 ? <span className="text-patina-mint ml-1">+${option.price.toFixed(2)}</span> : null}
                      {option.on_by_default ? <span className="text-muted-foreground ml-1">(default)</span> : null}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}