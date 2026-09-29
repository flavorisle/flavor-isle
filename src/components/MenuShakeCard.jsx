import React from 'react';
import { Plus } from 'lucide-react';
import { applyModifierOverrides } from '@/lib/modifierOverrides';
import { flavorNameFromItem, flavorEmojiByName } from '@/lib/shakeConfig';

export default function MenuShakeCard({ item, onSelect, orderingEnabled, overrides }) {
  const name = flavorNameFromItem(item.name);
  const size = applyModifierOverrides(item.modifiers, overrides)
    .find(group => (group.name || '').toLowerCase().includes('size'));
  const available = (size?.modifiers || []).filter(option => !option.sold_out);
  const from = (item.price || 0) + (available.length ? Math.min(...available.map(option => option.price || 0)) : 0);
  const soldOut = item.is_available === false;
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      disabled={soldOut || !orderingEnabled}
      className="card-diner w-64 min-h-[190px] p-5 flex flex-col items-center justify-center text-center disabled:opacity-60 disabled:cursor-not-allowed"
      aria-label={`${name} — ${soldOut ? 'Sold Out' : !orderingEnabled ? 'Ordering Closed' : 'Customize'}`}
    >
      <span className="text-4xl mb-2" aria-hidden="true">{flavorEmojiByName(name)}</span>
      <span className="font-heading text-obsidian-roast text-base leading-tight">{name}</span>
      <span className="text-xs text-muted-foreground mt-1.5">from ${from.toFixed(2)}</span>
      <span className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-heading px-3 py-2 rounded-full bg-patina-mint text-white">
        {soldOut ? 'Sold Out' : !orderingEnabled ? 'Ordering Closed' : <><Plus size={12} /> Customize</>}
      </span>
    </button>
  );
}