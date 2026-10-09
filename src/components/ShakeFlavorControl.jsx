import React from 'react';
import FlavorPillButton, { flavorAmountNested, getFlavorLevel } from '@/components/FlavorPillButton';
import FlavorAmountLegend from '@/components/FlavorAmountLegend';
import { flavorNameFromItem, flavorEmojiByName } from '@/lib/shakeConfig';

export function withShakeFlavorLevel(name, level) {
  return level ? `${level === 'lite' ? 'Lite' : 'Extra'} ${name}` : name;
}

export default function ShakeFlavorControl({ item, level, onChange }) {
  const name = flavorNameFromItem(item.name);
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Your Shake Flavor</p>
      <FlavorAmountLegend align="left" className="mb-2.5" />
      <FlavorPillButton
        mod={{ id: item.id, name, price: 0 }}
        leading={<span className="text-base leading-none" aria-hidden="true">{flavorEmojiByName(name)}</span>}
        isSelected
        onToggle={() => {}}
        nestedSelection={flavorAmountNested(level)}
        onNestedChange={nested => onChange(getFlavorLevel(nested))}
      />
    </div>
  );
}