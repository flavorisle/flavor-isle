import React from 'react';

// "Stops & Shops" walking-map header for Smiths Grove's Main Street block.
const STOPS = Array.from({ length: 14 }, (_, i) => i + 1);

export default function StopsShopsHeader() {
  return (
    <div className="pt-2">
      <p className="font-heading text-xs sm:text-sm tracking-[0.2em] uppercase text-midnight-cherry">
        Stops &amp; Shops
      </p>
      <h2 className="font-heading text-2xl sm:text-4xl text-obsidian-roast leading-none tracking-wide mt-1">
        Smiths Grove, Kentucky
      </h2>
      <p className="font-body text-[11px] sm:text-xs tracking-[0.12em] uppercase mt-2 text-obsidian-roast">
        Exit 38 off I-65
        <span className="text-midnight-cherry"> · 14 shops &amp; eateries, one walkable block</span>
      </p>

      <div className="overflow-x-auto scrollbar-hide mt-5" aria-hidden="true">
        <div className="relative flex items-center justify-center gap-1.5 sm:gap-2 w-max mx-auto">
          <span className="absolute left-3 right-3 top-1/2 -translate-y-1/2 border-t border-dashed border-obsidian-roast/30" />
          {STOPS.map((n) => (
            <span
              key={n}
              className={
                n === 2
                  ? 'relative z-10 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-obsidian-roast bg-vanilla-malt ring-4 ring-smashie-yellow/40 font-body text-[11px] sm:text-xs text-obsidian-roast'
                  : 'relative z-10 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-obsidian-roast/70 bg-vanilla-malt font-body text-[11px] sm:text-xs text-obsidian-roast'
              }
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      <p className="font-body text-[11px] sm:text-xs tracking-[0.14em] uppercase text-obsidian-roast mt-3">
        Park once &amp; stroll
      </p>
      <p className="font-body text-[11px] text-muted-foreground mt-1">
        Walking map by @marigold.manor · flavor-isle.com
      </p>
    </div>
  );
}