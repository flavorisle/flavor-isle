import React from 'react';
import { Check } from 'lucide-react';
import { ruleBadge } from '@/lib/modifierRules';
import { getModifierPhoto } from '@/lib/modifierPhotos';
import { optimizedImageUrl } from '@/lib/utils';

// One option on the card: the same photo tile a customer sees, with the options
// the store preselects shown ticked so the crew builds it the house way.
function OptionTile({ option }) {
  const photo = getModifierPhoto(option.name);
  const selected = option.on_by_default === true;
  const initial = String(option.name || '').trim().charAt(0).toUpperCase();

  return (
    <div
      className={`w-[120px] rounded-[13px] border-2 bg-white p-1 ${selected ? 'border-midnight-cherry' : 'border-border'}`}
    >
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-muted">
        {photo ? (
          <img
            src={optimizedImageUrl(photo.url, 240, 240, 'fit')}
            alt={photo.alt || option.name}
            width="240"
            height="240"
            loading="lazy"
            decoding="async"
            className="w-full h-full object-contain"
          />
        ) : (
          <span className="w-full h-full flex items-center justify-center font-heading text-2xl text-muted-foreground">
            {initial}
          </span>
        )}
        {selected ? (
          <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-midnight-cherry text-white flex items-center justify-center shadow">
            <Check size={12} strokeWidth={3} />
          </span>
        ) : null}
      </div>
      <div className="px-1 pt-1 pb-0.5">
        <p className="text-[10.5px] leading-tight font-bold text-obsidian-roast line-clamp-2">{option.name}</p>
        {option.price > 0 ? <p className="text-[10px] text-patina-mint font-semibold">+${option.price.toFixed(2)}</p> : null}
      </div>
    </div>
  );
}

// One food build card: the loaded item's real Square photo and price, the base
// fries it starts from, and every stacked modifier group as photo tiles.
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
                <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                  <p className="font-heading text-xs uppercase tracking-widest text-obsidian-roast">{group.name}</p>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {ruleBadge(group)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(group.modifiers || []).map((option) => (
                    <OptionTile key={option.id || option.name} option={option} />
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