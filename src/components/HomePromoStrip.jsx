import React from 'react';
import AdBannerStrip from '@/components/AdBannerStrip';
import MilkshakePromoBanner from '@/components/MilkshakePromoBanner';
import HappyHourBanner from '@/components/HappyHourBanner';

// One horizontal strip directly under the header nav that carries every live
// promotion — scheduled banners, the Shake Isle offer and Happy Hour — instead
// of each one owning a full-width section further down the page. Each piece
// renders nothing when it isn't live, so an empty strip collapses to nothing
// and never leaves a gap behind.
export default function HomePromoStrip() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 [&:empty]:hidden">
      <div className="flex flex-col gap-3">
        <MilkshakePromoBanner variant="strip" />
        <HappyHourBanner variant="compact" />
        <AdBannerStrip placement="home" />
      </div>
    </div>
  );
}