import React from 'react';

// "Stops & Shops" walking-map header for Smiths Grove's Main Street block.
// Order follows the walk from the north end of Main south toward the interstate.
const STOPS = [
  { n: 1, name: "Boone's Antiques" },
  { n: 2, name: 'Quarter Moon Antiques' },
  { n: 3, name: 'Main Street Antiques & Collectibles' },
  { n: 4, name: 'Pony Express Antiques & Collectibles' },
  { n: 5, name: "Psycho Granny's Quilt & Fabric Shop" },
  { n: 6, name: 'The Fox Hole' },
  { n: 7, name: 'Marigold Vintage' },
  { n: 8, name: 'Smalls' },
  { n: 9, name: 'The Garden Patch on Main' },
  { n: 10, name: 'Dixie Pharmacy' },
  { n: 11, name: 'Flavor Isle' },
  { n: 12, name: 'Smiths Grove Gun & Archery' },
  { n: 13, name: "Grammie's Home Cookin'" },
  { n: 14, name: 'Bank of Edmonson County' },
];

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

      <ol className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {STOPS.map((s) => (
          <li key={s.n} className="flex items-baseline gap-2">
            <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border border-obsidian-roast/50 flex items-center justify-center font-body text-[10px] leading-none text-obsidian-roast">
              {s.n}
            </span>
            <span className="font-body text-[12px] sm:text-[13px] leading-snug text-obsidian-roast">
              {s.name}
            </span>
          </li>
        ))}
      </ol>

      <p className="font-body text-[11px] sm:text-xs tracking-[0.14em] uppercase text-obsidian-roast mt-4">
        Park once &amp; stroll
      </p>
      <p className="font-body text-[11px] text-muted-foreground mt-1">
        Walking map by @marigold.manor · flavor-isle.com
      </p>
    </div>
  );
}