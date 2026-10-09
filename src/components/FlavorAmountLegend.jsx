import React from 'react';
import { Minus, Plus } from 'lucide-react';

// Legend for the − / + zones on a flavor pill. The pill swaps its icons for the
// words "Lite" / "Extra" only on hover, which a phone never shows — so this
// spells the amounts out right where the flavors are picked.
export default function FlavorAmountLegend({ align = 'center', tone = 'light', className = '' }) {
  const onDark = tone === 'dark';
  const chip = onDark ? 'bg-white/10 text-white' : 'bg-muted text-patina-mint';

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-body ${
        align === 'left' ? 'justify-start' : 'justify-center'
      } ${onDark ? 'text-gray-300' : 'text-muted-foreground'} ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${chip}`}>
          <Minus size={12} />
        </span>
        Lite
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${chip}`}>
          <Plus size={12} />
        </span>
        Extra
      </span>
      <span>Tap the name for regular.</span>
    </div>
  );
}