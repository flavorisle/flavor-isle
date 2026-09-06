import React from 'react';
import { base44 } from '@/api/base44Client';
import { categoryLabel } from '@/lib/menuCategory';

// Tappable category quick-jump bar. Renders one chip per menu category row;
// tapping a chip smooth-scrolls to that section and records an analytics event
// so category selection frequency can be measured.
export default function MenuCategoryChips({ rows, renames }) {
  if (!rows || rows.length === 0) return null;

  const jump = (row) => {
    const label = row.isShakeBanner ? 'Whirl & Twirl' : categoryLabel(row.key, renames);
    base44.analytics
      .track({ eventName: 'menu_category_selected', properties: { category: label } })
      .catch(() => {});
    const el = document.getElementById(`menu-cat-${row.key.replace(/[^a-zA-Z0-9]/g, '')}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="sticky top-0 z-30 bg-vanilla-malt/90 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {rows.map((row) => (
          <button
            key={row.key}
            onClick={() => jump(row)}
            className="px-4 py-2 rounded-full text-xs font-heading whitespace-nowrap bg-white text-obsidian-roast border border-border hover:border-midnight-cherry/40 hover:bg-midnight-cherry hover:text-white transition-all"
          >
            {row.isShakeBanner ? 'Whirl & Twirl' : categoryLabel(row.key, renames)}
          </button>
        ))}
      </div>
    </div>
  );
}