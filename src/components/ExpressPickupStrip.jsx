import React from 'react';
import { Zap } from 'lucide-react';
import { useCart } from '@/context/CartContext';

// Slim trust strip shown under the homepage hero. Only renders when ordering
// is enabled so it disappears automatically when the store is closed.
export default function ExpressPickupStrip() {
  const { orderingEnabled } = useCart();
  if (!orderingEnabled) return null;

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