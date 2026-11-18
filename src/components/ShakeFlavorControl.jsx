import React from 'react';
import { modifierLevelOptions } from '@/lib/modifierLevels';
import { findShakeFlavorOption } from '@/lib/shakeFlavor';
import { flavorNameFromItem } from '@/lib/shakeConfig';

export function withShakeFlavorLevel(name, level) {
  return level === 'lite' ? `Lite ${name}` : level === 'extra' ? `Extra ${name}` : name;
}

// The shake's own included flavor, as a title rather than a tile: the flavor is
// already on the shake, so it reads as a line of type. Its Lite / Reg / Extra
// amount is Square's own list on that flavor — the real option, so the order
// still reports it to Square as a catalog modifier. When the catalog has no such
// list, no amount control is shown: a level Square does not define is never
// invented on the site.
const AMOUNTS = [
  { key: 'lite', label: 'Lite' },
  { key: 'reg', label: 'Regular' },
  { key: 'extra', label: 'Extra' },
];

export default function ShakeFlavorControl({ item, level, onChange }) {
  const name = flavorNameFromItem(item.name);
  const real = findShakeFlavorOption(item);
  const mod = { ...real, id: real?.id || item.id, name, price: 0 };
  const levels = modifierLevelOptions(mod);
  const canLevel = levels.length > 0;
  const current = level || 'reg';

  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
        Your Shake Flavor
      </p>
      <h3 className="font-heading text-2xl text-obsidian-roast leading-tight">{name}</h3>
      {canLevel && (
        <div
          role="group"
          aria-label={`${name} amount`}
          className="inline-flex mt-2 rounded-full border-2 border-midnight-cherry overflow-hidden"
        >
          {AMOUNTS.filter((amount) => levels.includes(amount.key)).map((amount, i) => {
            const on = current === amount.key;
            return (
              <button
                key={amount.key}
                type="button"
                aria-pressed={on}
                onClick={() => onChange(amount.key === 'reg' ? null : amount.key)}
                className={`min-h-[36px] px-4 font-heading text-xs uppercase tracking-wider transition-colors ${
                  i > 0 ? 'border-l-2 border-midnight-cherry/30' : ''
                } ${on ? 'bg-midnight-cherry text-white' : 'bg-white text-midnight-cherry'}`}
              >
                {amount.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}