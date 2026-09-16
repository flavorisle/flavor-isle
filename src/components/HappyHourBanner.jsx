import React from 'react';
import { Clock, Tag } from 'lucide-react';
import { isHappyHourActive, formatHappyHourWindow, getHappyHourConfig } from '@/lib/happyHour';
import { getMenuSetting } from '@/lib/menuSettings';
import { useState, useEffect } from 'react';

// Static (non-popup) promo banner advertising the daily Happy Hour deal.
// Shows on the homepage and menu page. When the window is currently active,
// it highlights "HAPPENING NOW"; otherwise it announces the daily deal.
// Re-fetches the menu setting every 60s so the banner updates when the
// window opens/closes without a page reload.
export default function HappyHourBanner({ variant = 'full' }) {
  const [setting, setSetting] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => getMenuSetting().then(s => { if (!cancelled) setSetting(s); }).catch(() => {});
    load();
    const timer = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  const hh = getHappyHourConfig(setting);
  if (!hh || !hh.active) return null;

  const active = isHappyHourActive(setting);
  const window = formatHappyHourWindow(setting);
  const pct = hh.discount_percent || 50;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-heading ${
        active ? 'bg-midnight-cherry text-white' : 'bg-midnight-cherry/10 text-midnight-cherry'
      }`}>
        <Tag size={14} className="flex-shrink-0" />
        <span>Happy Hour · {pct}% off drinks · {window} daily</span>
        {active && <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded-full animate-pulse">NOW</span>}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl ${
      active
        ? 'bg-gradient-to-r from-midnight-cherry to-[#aa2900] text-white shadow-float-lg'
        : 'bg-midnight-cherry/10 text-obsidian-roast border-2 border-midnight-cherry/20'
    }`}>
      <div className="flex items-center gap-4 px-6 py-5 sm:px-8 sm:py-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
          active ? 'bg-white/20' : 'bg-midnight-cherry/15'
        }`}>
          <Clock size={24} className={active ? 'text-white' : 'text-midnight-cherry'} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading text-lg sm:text-xl leading-none">
              Happy Hour — {pct}% Off Drinks
            </h3>
            {active && (
              <span className="text-xs font-heading bg-white/25 px-2.5 py-1 rounded-full animate-pulse">
                HAPPENING NOW
              </span>
            )}
          </div>
          <p className={`text-sm mt-1 ${active ? 'text-white/85' : 'text-muted-foreground'}`}>
            Half off all Classic Drinks — Coke, Coke Zero, Dr Pepper, Sprite, Root Beer & Sweet Tea. {window} daily.
          </p>
        </div>
      </div>
    </div>
  );
}