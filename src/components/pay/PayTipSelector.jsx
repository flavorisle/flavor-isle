import React from 'react';
import { tipAmountFor } from '@/lib/phoneTip';

// Same tipping as the web checkout: percentage presets, flat dollars on small
// orders, a custom amount, and an easy skip.
export default function PayTipSelector({ presets, preset, onPreset, customTip, onCustomTip }) {
  const amount = tipAmountFor(preset, presets, customTip);
  const pill = (key) =>
    `py-2 rounded-xl border-2 font-heading text-sm transition-all ${
      preset === key
        ? 'border-midnight-cherry bg-midnight-cherry text-white'
        : 'border-border text-obsidian-roast hover:border-midnight-cherry/40'
    }`;

  return (
    <div className="card-diner p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-heading text-base text-obsidian-roast">Add a Tip</h2>
        <span className="text-midnight-cherry font-heading text-base">${amount.toFixed(2)}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-3">100% goes to the kitchen crew.</p>

      <div className="grid grid-cols-4 gap-2">
        {presets.map((p) => (
          <button key={p.key} type="button" onClick={() => onPreset(p.key)} className={pill(p.key)}>
            {p.label}
          </button>
        ))}
        <button type="button" onClick={() => onPreset('custom')} className={pill('custom')}>
          Custom
        </button>
      </div>

      {preset === 'custom' && (
        <div className="mt-2 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
          <input
            type="number"
            min="0"
            step="0.50"
            inputMode="decimal"
            value={customTip}
            onChange={(e) => onCustomTip(e.target.value)}
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => { onPreset('0'); onCustomTip(''); }}
        className="mt-2 text-xs text-muted-foreground underline hover:text-midnight-cherry transition-colors"
      >
        No tip
      </button>
    </div>
  );
}