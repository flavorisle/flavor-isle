import React from 'react';
import { base44 } from '@/api/base44Client';
import { categoryLabel } from '@/lib/menuCategory';

// Emoji icon per category — matched case-insensitively on the category key so
// custom display categories fall back to a generic plate when unmapped.
const CATEGORY_ICONS = {
  burgers: '🍔',
  chicken: '🍗',
  sides: '🍟',
  shakes: '🥤',
  drinks: '🧃',
  breakfast: '🍳',
  specials: '⭐',
  desserts: '🍰',
  combos: '🌯',
};

const iconFor = (key) => {
  const k = (key || '').toLowerCase();
  for (const [cat, emoji] of Object.entries(CATEGORY_ICONS)) {
    if (k.includes(cat)) return emoji;
  }
  return '🍽️';
};

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
    if (!el) return;
    // Offset by the sticky header height (site notice + live status + nav) so
    // the target section lands below it instead of scrolling underneath.
    const nav = document.querySelector('nav');
    const offset = nav ? nav.getBoundingClientRect().bottom : 0;
    const y = el.getBoundingClientRect().top + window.scrollY - offset - 12;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  return (
    <div className="sticky top-0 z-30 bg-vanilla-malt/90 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex gap-2.5 overflow-x-auto scrollbar-hide">
        {rows.map((row) => {
          const label = row.isShakeBanner ? 'Whirl & Twirl' : categoryLabel(row.key, renames);
          const icon = row.isShakeBanner ? '🥤' : iconFor(row.key);
          return (
            <button
              key={row.key}
              onClick={() => jump(row)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-heading whitespace-nowrap bg-white text-obsidian-roast border border-border hover:border-midnight-cherry/40 hover:bg-midnight-cherry hover:text-white transition-all min-h-[44px] flex-shrink-0"
            >
              <span className="text-lg leading-none" aria-hidden="true">{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}