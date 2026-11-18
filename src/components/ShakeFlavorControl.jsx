import React from 'react';
import FlavorPillButton, { getFlavorLevel } from '@/components/FlavorPillButton';
import FlavorAmountLegend from '@/components/FlavorAmountLegend';
import { nestedForLevel, supportsLevels } from '@/lib/modifierLevels';
import { flavorNameFromItem } from '@/lib/shakeConfig';

export function withShakeFlavorLevel(name, level) {
  return level ? `${level === 'lite' ? 'Lite' : 'Extra'} ${name}` : name;
}

// The shake's own included flavor, as a tile. Its Lite / Reg / Ex strip is
// Square's own amount list on that flavor — the real option, so the order
// reports it to Square as a catalog modifier. When the catalog has no such
// list, the tile carries no strip: a level Square does not define is never
// invented on the site.
function findFlavorOption(item, flavorName) {
  const want = String(flavorName || '').trim().toLowerCase();
  for (const group of item.modifiers || []) {
    for (const mod of group.modifiers || []) {
      if (String(mod.name || '').trim().toLowerCase() === want) return mod;
    }
  }
  return null;
}

export default function ShakeFlavorControl({ item, level, onChange }) {
  const name = flavorNameFromItem(item.name);
  const real = findFlavorOption(item, name);
  const mod = {
    id: real?.id || item.id,
    name,
    price: 0,
    child_modifier_lists: real?.child_modifier_lists || [],
  };
  const canLevel = supportsLevels(mod);

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Your Shake Flavor</p>
      {canLevel && <FlavorAmountLegend align="left" className="mb-2.5" />}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 120px))', gap: '6px', justifyContent: 'center' }}>
        <FlavorPillButton
          mod={mod}
          isSelected
          levels={canLevel}
          onToggle={() => {}}
          nestedSelection={canLevel ? nestedForLevel(mod, level) : {}}
          onNestedChange={nested => onChange(getFlavorLevel(nested))}
        />
      </div>
    </div>
  );
}