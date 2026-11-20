import React from 'react';
import { Check } from 'lucide-react';
import PriceChip from '@/components/ui/PriceChip';

// The bar pinned to the bottom of the builder: what is in the box on the left,
// the one total and the Add box button on the right. No savings, no percentage,
// no strikethrough — the customer sees a single box price, as before.
export default function ComboSummaryBar({ typeName, picks, price, onAdd, added, disabled }) {
  const names = picks.filter(Boolean);
  return (
    <div className="sticky bottom-0 z-10 -mx-6 md:-mx-8 rounded-t-2xl bg-white border-t border-border shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-6 md:px-8 py-4 mt-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          {names.length === 3 ? (
            <>
              <p className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">{typeName} combo</p>
              <p className="text-sm text-muted-foreground truncate">{names.map((p) => p.name).join(' + ')}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Pick one from each step to see your total</p>
          )}
        </div>
        <div className="flex items-center gap-4 sm:justify-end">
          {names.length === 3 && (
            <PriceChip amount={price} className="px-4 py-1 text-2xl text-midnight-cherry" />
          )}
          <button
            onClick={onAdd}
            disabled={disabled}
            className="btn-cherry chrome-hover px-7 py-3.5 text-sm font-heading disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {added ? <><Check size={16} /> Added!</> : 'Add box'}
          </button>
        </div>
      </div>
    </div>
  );
}