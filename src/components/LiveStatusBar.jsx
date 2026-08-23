import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Clock, ArrowRight } from 'lucide-react';
import useLiveStatus from '@/hooks/useLiveStatus';

// Four branded "mode" cards — one per live kitchen-load level. The card art
// (mascot + panel + CTA) is the designed asset; the bar swaps between them
// based on the real-time busyness reading from getBusyness (~90% accurate).
const MODES = {
  'Running Smooth': {
    image: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/47a638927_IMG_1004.png',
    title: 'Chill Mode — Kitchen Wide Open',
    frame: '#0033cc',
  },
  'A Little Busy': {
    image: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/db8ae0e6f_IMG_1007.png',
    title: 'Steady Mode — Moving Smooth',
    frame: '#1a4f00',
  },
  Busy: {
    image: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7d4301c5c_IMG_1006.png',
    title: 'Flex Mode — Getting Busy',
    frame: '#E6A200',
  },
  Slammed: {
    image: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/eda439c8e_IMG_1005.png',
    title: 'Melt Mode — Max Capacity',
    frame: '#A6260B',
  },
};

// Always-on-top live status. Open kitchen → full mode card banner that swaps
// with the live load; last hour → compact "closing soon" urgency; after hours
// or admin closure → compact "closed" bar.
export default function LiveStatusBar() {
  const {
    loading,
    isClosed,
    closingSoon,
    level,
    orderingEnabled,
    minutesUntilClose,
    closeTime,
    closureMessage,
  } = useLiveStatus();

  // ── Closed (after hours or admin closure) ──
  if (isClosed) {
    return (
      <div className="w-full bg-gray-100 border-b border-gray-200 text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Lock size={16} className="flex-shrink-0" />
            <p aria-live="polite" className="text-sm font-heading uppercase tracking-wide truncate">
              Closed{closureMessage ? ` · ${closureMessage}` : ''}
            </p>
          </div>
          <Link
            to="/contact"
            className="text-xs font-heading uppercase tracking-wide text-gray-500 hover:text-obsidian-roast transition-colors tap-44 inline-flex items-center"
          >
            See hours
          </Link>
        </div>
      </div>
    );
  }

  // ── Closing soon (within 60 min of today's close) ──
  if (closingSoon) {
    return (
      <div className="w-full bg-smashie-yellow text-obsidian-roast border-b border-obsidian-roast/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Clock size={16} className="flex-shrink-0" />
            <p aria-live="polite" className="text-sm font-heading uppercase tracking-wide truncate">
              Closing soon{closeTime ? ` · closes ${closeTime}` : ''}{minutesUntilClose != null ? ` · ${minutesUntilClose} min` : ''}
            </p>
          </div>
          {orderingEnabled ? (
            <Link
              to="/menu"
              className="tap-44 inline-flex items-center gap-1.5 bg-midnight-cherry text-white px-4 rounded-full text-xs font-heading uppercase tracking-wide chrome-hover"
            >
              Order Now <ArrowRight size={13} />
            </Link>
          ) : (
            <span className="text-xs font-heading uppercase tracking-wide opacity-70">Ordering paused</span>
          )}
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (loading || !level) {
    return (
      <div className="w-full bg-vanilla-malt border-b border-border text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300 animate-pulse" />
          <p className="text-sm font-heading uppercase tracking-wide">Checking kitchen status…</p>
        </div>
      </div>
    );
  }

  // ── Live busyness mode card ──
  const mode = MODES[level.level] || MODES['Running Smooth'];

  const card = (
    <div className="w-full px-3 pt-3 pb-3" style={{ background: 'var(--vanilla-malt)' }}>
      <div
        className="mx-auto max-w-sm rounded-2xl overflow-hidden shadow-float"
        style={{ background: mode.frame }}
      >
        <img
          src={mode.image}
          alt={mode.title}
          className="block w-full max-h-[240px] sm:max-h-[280px] object-contain"
          loading="eager"
        />
      </div>
    </div>
  );

  if (!orderingEnabled) {
    return (
      <div className="relative">
        {card}
        <span className="absolute top-5 left-1/2 -translate-x-1/2 bg-obsidian-roast/85 text-white text-[10px] font-heading uppercase tracking-widest px-3 py-1 rounded-full">
          Ordering paused
        </span>
      </div>
    );
  }

  return (
    <Link
      to="/menu"
      aria-label={`${mode.title} — order now`}
      className="block w-full"
    >
      {card}
    </Link>
  );
}