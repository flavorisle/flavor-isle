import React from 'react';
import FlavorPillButton, { flavorAmountNested, getFlavorLevel } from '@/components/FlavorPillButton';
import FlavorAmountLegend from '@/components/FlavorAmountLegend';
import { flavorNameFromItem } from '@/lib/shakeConfig';

export function withShakeFlavorLevel(name, level) {
  return level ? `${level === 'lite' ? 'Lite' : 'Extra'} ${name}` : name;
}

// The shake's own included flavor, as a tile with the same Lite / Reg / Ex
// strip every other option uses. No emoji: the tile shows the flavor's first
// letter until a real syrup photo is added in Admin → Modifier photos.
export default function ShakeFlavorControl({ item, level, onChange }) {
  const name = flavorNameFromItem(item.name);
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Your Shake Flavor</p>
      <FlavorAmountLegend align="left" className="mb-2.5" />
      <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 120px))', gap: '6px', justifyContent: 'center' }}>
        <FlavorPillButton
          mod={{ id: item.id, name, price: 0 }}
          isSelected
          onToggle={() => {}}
          nestedSelection={flavorAmountNested(level)}
          onNestedChange={nested => onChange(getFlavorLevel(nested))}
        />
      </div>
    </div>
  );
}