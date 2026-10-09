import React from 'react';
import { Check } from 'lucide-react';

export default function ClassicDrinkIceSize({ mod, selected, level = 'regular', onSelect }) {
  const disabled = !!mod.sold_out;
  const state = selected ? level : 'regular';
  return (
    <div className={`inline-flex items-stretch rounded-full border-2 overflow-hidden font-body text-sm font-semibold ${selected ? 'border-midnight-cherry bg-midnight-cherry/5' : 'border-gray-300 bg-white'}`}>
      <button type="button" disabled={disabled} onClick={() => onSelect(mod, 'light')}
        aria-label={`Light Ice, ${mod.name}`} aria-pressed={selected && state === 'light'}
        className={`min-w-11 min-h-11 px-3 flex items-center justify-center disabled:opacity-50 ${selected && state === 'light' ? 'bg-midnight-cherry text-white' : 'bg-midnight-cherry/10 text-midnight-cherry hover:bg-midnight-cherry/20'}`}>
        <span className="text-xs font-heading uppercase tracking-wide">Light</span>
      </button>
      <button type="button" disabled={disabled} onClick={() => onSelect(mod, 'regular')}
        aria-label={`${mod.name}, Regular Ice${mod.price > 0 ? `, plus $${mod.price.toFixed(2)}` : ''}`}
        aria-pressed={selected}
        className="min-h-11 px-3 flex flex-col items-center justify-center text-obsidian-roast disabled:opacity-50">
        <span className="flex items-center gap-1">{selected && <Check size={13} />} {mod.name}{mod.price > 0 && <span className="text-xs text-midnight-cherry">+${mod.price.toFixed(2)}</span>}</span>
        <span className="text-xs font-normal">{state === 'light' ? 'Light Ice' : state === 'extra' ? 'Extra Ice' : 'Regular Ice'}</span>
      </button>
      <button type="button" disabled={disabled} onClick={() => onSelect(mod, 'extra')}
        aria-label={`Extra Ice, ${mod.name}`} aria-pressed={selected && state === 'extra'}
        className={`min-w-11 min-h-11 px-3 flex items-center justify-center disabled:opacity-50 ${selected && state === 'extra' ? 'bg-midnight-cherry text-white' : 'bg-midnight-cherry/10 text-midnight-cherry hover:bg-midnight-cherry/20'}`}>
        <span className="text-xs font-heading uppercase tracking-wide">Extra</span>
      </button>
    </div>
  );
}