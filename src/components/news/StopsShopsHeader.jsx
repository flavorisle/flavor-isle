import React, { useState } from 'react';
import { STOPS } from '@/components/news/stopsShopsStops';
import StopDetailDialog from '@/components/news/StopDetailDialog';

// "Stops & Shops" walking-map header for Smiths Grove's Main Street block.
// Tapping a name in the key opens a short description of that stop.
export default function StopsShopsHeader() {
  const [selectedStop, setSelectedStop] = useState(null);

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
          {STOPS.map((s) => (
            <span
              key={s.n}
              className={
                s.n === 2
                  ? 'relative z-10 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-obsidian-roast bg-vanilla-malt ring-4 ring-smashie-yellow/40 font-body text-[11px] sm:text-xs text-obsidian-roast'
                  : 'relative z-10 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-obsidian-roast/70 bg-vanilla-malt font-body text-[11px] sm:text-xs text-obsidian-roast'
              }
            >
              {s.n}
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        {STOPS.map((s) => (
          <li key={s.n}>
            <button
              type="button"
              onClick={() => setSelectedStop(s)}
              className="group flex items-baseline gap-2 w-full text-left py-1 -mx-1 px-1 rounded-lg hover:bg-obsidian-roast/5 transition-colors"
            >
              <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border border-obsidian-roast/50 flex items-center justify-center font-body text-[10px] leading-none text-obsidian-roast">
                {s.n}
              </span>
              <span className="font-body text-[12px] sm:text-[13px] leading-snug text-obsidian-roast underline decoration-obsidian-roast/25 underline-offset-2 group-hover:decoration-obsidian-roast/70">
                {s.name}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="font-body text-[11px] sm:text-xs tracking-[0.14em] uppercase text-obsidian-roast mt-4">
        Park once &amp; stroll
      </p>
      <p className="font-body text-[11px] text-muted-foreground mt-1">
        Walking map by @marigold.manor · flavor-isle.com
      </p>

      <StopDetailDialog stop={selectedStop} onClose={() => setSelectedStop(null)} />
    </div>
  );
}