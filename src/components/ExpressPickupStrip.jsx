import React from 'react';
import { Zap } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import useLiveStatus from '@/hooks/useLiveStatus';

// Busyness levels that suppress the Express Pickup promise — the "ready in
// 10–15 mins" claim only rings true when the kitchen is running smooth.
const BUSY_LEVELS = ['A Little Busy', 'Busy', 'Slammed'];

// Slim trust strip shown under the homepage hero. Only renders when ordering
// is enabled AND the kitchen isn't busy. Fails open: while the busyness level
// is loading, unknown, or unavailable the strip still shows so it never breaks
// or flickers — it reappears within ~60s of the level dropping back to smooth.
export default function ExpressPickupStrip() {
  const { orderingEnabled } = useCart();
  const { level } = useLiveStatus();
  if (!orderingEnabled) return null;
  if (level?.level && BUSY_LEVELS.includes(level.level)) return null;

  return (
    <div className="bg-midnight-cherry text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-center gap-2.5 text-center">
        <Zap size={16} className="text-smashie-yellow flex-shrink-0" />
        <p className="text-sm font-body leading-tight">
          <strong className="font-heading tracking-wide">Express Pickup:</strong>{' '}
          Ready in 10–15 mins. Order on your phone, pull into Curbside, and we bring it out hot.
        </p>
      </div>
    </div>
  );
}