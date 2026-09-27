import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, Clock, ArrowRight, ShoppingBag } from 'lucide-react';
import useLiveStatus from '@/hooks/useLiveStatus';
import BusynessBetaTag from '@/components/BusynessBetaTag';

// Colored status dot per live busyness level.
const DOT = {
  'Running Smooth': 'bg-green-500',
  'A Little Busy': 'bg-yellow-400',
  Busy: 'bg-orange-400',
  Slammed: 'bg-red-500',
};

// Dynamic CTA copy that shifts by kitchen load — the "Level + dynamic CTA"
// treatment so guests get a nudge calibrated to the current wait. The minute
// count is filled from the live backend estimate so it always matches the
// wait time shown next to the level name.
const CTA_BY_LEVEL = {
  'Running Smooth': 'Order now — no wait',
  'A Little Busy': 'Order ahead',
  Busy: 'Order ahead',
  Slammed: 'Order ahead',
};

// Always-on-top live status bar. Replaces the old static navbar info bar with
// a single source of truth for how busy the kitchen is right now, with a
// dynamic order CTA, a "closing soon" urgency state in the last hour, and a
// "Closed" state after hours or during an admin closure.
export default function LiveStatusBar() {
  const {
    loading,
    isClosed,
    closingSoon,
    level,
    wait,
    waitMin,
    orderingEnabled,
    minutesUntilClose,
    closeTime,
    closureMessage,
  } = useLiveStatus();
  const location = useLocation();

  // Tasty Threads (Printful) ships on demand 24/7 — the kitchen hours/closure
  // status doesn't apply to merch, so merch routes get their own always-open
  // bar instead of the "Closed" / busyness messaging.
  if (location.pathname.startsWith('/merch')) {
    return (
      <div className="w-full bg-patina-mint text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ShoppingBag size={16} className="flex-shrink-0" />
            <p className="text-sm font-heading uppercase tracking-wide truncate">
              Tasty Threads · Ships on demand 24/7
            </p>
          </div>
          <Link
            to="/merch"
            className="tap-44 inline-flex items-center gap-1.5 bg-smashie-yellow text-obsidian-roast px-4 rounded-full text-xs font-heading uppercase tracking-wide chrome-hover"
          >
            Shop Now <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    );
  }

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

  // ── Live busyness level ──
  const dot = DOT[level.level] || 'bg-gray-300';
  const baseCta = CTA_BY_LEVEL[level.level] || 'Order Now';
  // Append the live wait estimate (when the kitchen is busy) so the CTA's
  // minute count matches the wait shown next to the level name.
  const cta = baseCta === 'Order ahead' && waitMin
    ? `Order ahead — ~${waitMin} min`
    : baseCta;

  return (
    <div className="w-full bg-vanilla-malt border-b border-border text-obsidian-roast">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse ${dot}`} />
          <p aria-live="polite" className="text-sm font-heading uppercase tracking-wide truncate">
            {level.level}<span className="hidden sm:inline text-muted-foreground font-body normal-case tracking-normal"> · {wait}</span>
          </p>
          <BusynessBetaTag />
          <Link
            to="/what-to-expect"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-body normal-case tracking-normal text-patina-mint hover:text-midnight-cherry transition-colors tap-44"
            title="What each level means & ordering tips"
          >
            What to expect?
          </Link>
        </div>
        {orderingEnabled ? (
          <Link
            to="/menu"
            className="tap-44 inline-flex items-center gap-1.5 bg-midnight-cherry text-white px-4 rounded-full text-xs font-heading uppercase tracking-wide chrome-hover"
          >
            {cta} <ArrowRight size={13} />
          </Link>
        ) : (
          <span className="text-xs font-heading uppercase tracking-wide text-muted-foreground">Ordering paused</span>
        )}
      </div>
    </div>
  );
}