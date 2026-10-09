import React from 'react';
// Legend for the Lite / Extra zones on a flavor pill. The pill's side zones
// carry their word on a filled tint, so this just spells the two amounts out
// right where the flavors are picked.
export default function FlavorAmountLegend({ align = 'center', tone = 'light', className = '' }) {
  const onDark = tone === 'dark';
  const chip = onDark ? 'bg-white/10 text-white' : 'bg-muted text-patina-mint';

  return (
    <div
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-body ${
        align === 'left' ? 'justify-start' : 'justify-center'
      } ${onDark ? 'text-gray-300' : 'text-muted-foreground'} ${className}`}
    >
      <span className={`inline-flex items-center justify-center h-5 px-2 rounded-full font-heading text-[10px] uppercase tracking-wide ${chip}`}>
        Lite
      </span>
      <span className={`inline-flex items-center justify-center h-5 px-2 rounded-full font-heading text-[10px] uppercase tracking-wide ${chip}`}>
        Extra
      </span>
      <span>Tap the name for regular.</span>
    </div>
  );
}