import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { getMenuSetting } from '@/lib/menuSettings';
import { getHappyHourConfig } from '@/lib/happyHour';
import AdBannerStrip, { isWithinDateWindow } from '@/components/AdBannerStrip';
import MilkshakePromoBanner from '@/components/MilkshakePromoBanner';
import HappyHourBanner from '@/components/HappyHourBanner';

// One horizontal strip that carries a single live promotion — a scheduled home
// banner first, then Happy Hour, then the Shake Isle offer — instead of each one
// owning its own full-width block. Exactly one thing renders: the strip picks
// the highest-priority live promo and shows only that, so a page never stacks
// two banners on top of each other.
export default function HomePromoStrip() {
  const [slot, setSlot] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      base44.entities.AdBanner
        .filter({ placement: 'home', is_active: true }, 'sort_order')
        .catch(() => []),
      getMenuSetting().catch(() => null),
    ])
      .then(([banners, setting]) => {
        if (cancelled) return;
        if ((banners || []).some(isWithinDateWindow)) setSlot('ad');
        else if (getHappyHourConfig(setting)?.active) setSlot('happyHour');
        else setSlot('shake');
      })
      .catch(() => { if (!cancelled) setSlot('shake'); });
    return () => { cancelled = true; };
  }, []);

  if (!slot) return null;

  // AdBannerStrip carries its own page-width wrapper and spacing.
  if (slot === 'ad') return <AdBannerStrip placement="home" limit={1} />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
      {slot === 'happyHour' ? <HappyHourBanner variant="compact" /> : <MilkshakePromoBanner variant="strip" />}
    </div>
  );
}