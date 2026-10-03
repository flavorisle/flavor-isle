import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const slug = (key) => key.replace(/[^a-zA-Z0-9]/g, '');
const sectionId = (key) => `menu-cat-${slug(key)}`;

// Tappable category quick-jump bar. Renders one chip per menu category row;
// tapping a chip smooth-scrolls to that section, the active chip highlights,
// and scroll-spy keeps the highlight in sync as the user scrolls. The chip
// row sticks below the sticky header and auto-scrolls horizontally to keep
// the active pill visible on small screens.
export default function MenuCategoryChips({ rows, renames }) {
  const [activeKey, setActiveKey] = useState(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const chipRowRef = useRef(null);
  const chipRefs = useRef({});
  const ticking = useRef(false);

  // Measure the sticky header height (site notice + live status + nav) once
  // on mount and on resize so the chip bar sticks right below it and scroll
  // offsets account for it. Also stamps scroll-margin-top onto every menu
  // section so scrollIntoView lands below the sticky header.
  useEffect(() => {
    const measure = () => {
      const nav = document.querySelector('nav');
      const h = nav ? Math.round(nav.getBoundingClientRect().bottom) : 0;
      setHeaderHeight(h);
      document.querySelectorAll('[id^="menu-cat-"]').forEach((el) => {
        el.style.scrollMarginTop = `${h + 12}px`;
      });
    };
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
    };
  }, []);

  const jump = useCallback((row) => {
    const label = row.isShakeBanner ? 'Whirl & Twirl' : categoryLabel(row.key, renames);
    // Analytics must never block the scroll — wrap in try/catch so a missing
    // or broken analytics client doesn't swallow the click.
    try {
      base44.analytics.track({ eventName: 'menu_category_selected', properties: { category: label } });
    } catch {}
    const el = document.getElementById(sectionId(row.key));
    if (!el) return;
    // scrollIntoView with block:'start' respects scroll-margin-top (set above)
    // and is more reliable than manual window.scrollTo across browsers.
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveKey(row.key);
  }, [renames]);

  // Scroll-spy: highlight the pill for the section currently in view.
  useEffect(() => {
    if (!rows || rows.length === 0) return;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        ticking.current = false;
        const threshold = (headerHeight || 0) + 60;
        let currentKey = null;
        for (const row of rows) {
          const el = document.getElementById(sectionId(row.key));
          if (!el) continue;
          if (el.getBoundingClientRect().top <= threshold) currentKey = row.key;
        }
        if (currentKey) setActiveKey(currentKey);
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [rows, headerHeight]);

  // Auto-scroll the active pill into view within the chip row (horizontal).
  useEffect(() => {
    if (!activeKey) return;
    const chip = chipRefs.current[activeKey];
    const container = chipRowRef.current;
    if (!chip || !container) return;
    const target = chip.offsetLeft - (container.offsetWidth - chip.offsetWidth) / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }, [activeKey]);

  if (!rows || rows.length === 0) return null;

  return (
    <div
      className="sticky z-30 bg-vanilla-malt/90 backdrop-blur border-b border-border"
      style={{ top: `${headerHeight}px` }}
    >
      <div ref={chipRowRef} className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex gap-4 overflow-x-auto scrollbar-hide">
        {rows.map((row) => {
          const label = row.isShakeBanner ? 'Whirl & Twirl' : categoryLabel(row.key, renames);
          const icon = row.isShakeBanner ? '🥤' : iconFor(row.key);
          const active = activeKey === row.key;
          return (
            <button
              key={row.key}
              ref={(el) => { if (el) chipRefs.current[row.key] = el; }}
              onClick={() => jump(row)}
              aria-current={active ? 'true' : undefined}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-heading whitespace-nowrap border transition-all min-h-[44px] flex-shrink-0 ${
                active
                  ? 'bg-midnight-cherry text-white border-midnight-cherry'
                  : 'bg-white text-obsidian-roast border-border hover:border-midnight-cherry/40 hover:bg-midnight-cherry hover:text-white'
              }`}
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