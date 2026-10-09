import React from 'react';
import { Check } from 'lucide-react';

export default function ClassicDrinkIceSize({ mod, selected, level = 'regular', onSelect }) {
  const disabled = !!mod.sold_out;
  const state = selected ? level : 'regular';
  return (
    <div className={`inline-flex w-full min-w-0 items-stretch rounded-full border-2 overflow-hidden font-body text-sm font-semibold sm:w-auto ${selected ? 'border-midnight-cherry bg-midnight-cherry/5' : 'border-gray-300 bg-white'}`}>
      <button type="button" disabled={disabled} onClick={() => onSelect(mod, 'light')}
        aria-label={`Light Ice, ${mod.name}`} aria-pressed={selected && state === 'light'}
        className={`min-w-[36px] min-h-11 px-1 flex items-center justify-center disabled:opacity-50 sm:min-w-11 sm:px-3 ${selected && state === 'light' ? 'bg-midnight-cherry text-white' : 'bg-midnight-cherry/10 text-midnight-cherry hover:bg-midnight-cherry/20'}`}>
        <span className="text-[10px] font-heading uppercase tracking-wide sm:text-xs">Light</span>
      </button>
      <button type="button" disabled={disabled} onClick={() => onSelect(mod, 'regular')}
        aria-label={`${mod.name}, Regular Ice${mod.price > 0 ? `, plus $${mod.price.toFixed(2)}` : ''}`}
        aria-pressed={selected}
        className="min-h-11 min-w-0 flex-1 px-2 py-1.5 flex flex-col items-center justify-center text-center text-obsidian-roast disabled:opacity-50 sm:px-3">
        <span className="flex min-w-0 flex-wrap items-center justify-center gap-1">
          {selected && <Check size={13} className="flex-shrink-0" />}
          <span className="min-w-0 break-words text-[13px] leading-tight sm:text-sm">{mod.name}</span>
          {mod.price > 0 && <span className="whitespace-nowrap text-[11px] text-midnight-cherry sm:text-xs">+${mod.price.toFixed(2)}</span>}
        </span>
        <span className="whitespace-nowrap text-[11px] font-normal sm:text-xs">{state === 'light' ? 'Light Ice' : state === 'extra' ? 'Extra Ice' : 'Regular Ice'}</span>
      </button>
      <button type="button" disabled={disabled} onClick={() => onSelect(mod, 'extra')}
        aria-label={`Extra Ice, ${mod.name}`} aria-pressed={selected && state === 'extra'}
        className={`min-w-[36px] min-h-11 px-1 flex items-center justify-center disabled:opacity-50 sm:min-w-11 sm:px-3 ${selected && state === 'extra' ? 'bg-midnight-cherry text-white' : 'bg-midnight-cherry/10 text-midnight-cherry hover:bg-midnight-cherry/20'}`}>
        <span className="text-[10px] font-heading uppercase tracking-wide sm:text-xs">Extra</span>
      </button>
    </div>
  );
}