import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { optimizedImageUrl } from '@/lib/utils';

const APP_ICON = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';

// Shown while an order is being prepared — a high-visibility moment to plug
// the upcoming native app launch.
export default function AppDroppingSoonBanner() {
  return (
    <div className="mt-4 rounded-2xl overflow-hidden" style={{ backgroundColor: '#003366' }}>
      <div className="flex items-center gap-3 p-4">
        <img src={optimizedImageUrl(APP_ICON, 160, 160, 'fit')} alt="Flavor Isle app" width="160" height="160" className="w-10 h-10 rounded-xl object-contain bg-white/90 p-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-smashie-yellow rounded-full animate-pulse" />
            <p className="font-heading text-white text-sm leading-none">THE APP IS DROPPING SOON</p>
          </div>
          <p className="text-white/70 text-[11px] mt-1 leading-snug">Track orders faster — launching on the App Store & Google Play</p>
        </div>
        <Link
          to="/download"
          className="flex items-center gap-1 bg-smashie-yellow text-obsidian-roast font-heading text-xs px-3 py-2 rounded-full hover:bg-yellow-400 transition-colors flex-shrink-0 tap-44"
        >
          See <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}