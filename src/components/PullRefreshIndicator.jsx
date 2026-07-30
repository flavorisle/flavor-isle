import React from 'react';
import { RefreshCw } from 'lucide-react';

// Floating spinner shown while a pull-to-refresh gesture is in progress.
export default function PullRefreshIndicator({ pull, refreshing, threshold = 70 }) {
  if (pull <= 0 && !refreshing) return null;

  const shown = Math.min(pull, 80);
  const spin = refreshing ? 'animate-spin' : '';
  const rotate = Math.min(180, (pull / threshold) * 180);

  return (
    <div
      className="fixed top-0 inset-x-0 z-[60] flex justify-center pointer-events-none"
      style={{
        transform: `translateY(${shown}px)`,
        transition: refreshing || pull > 0 ? 'none' : 'transform 0.25s ease-out',
      }}
    >
      <div className="mt-2 w-10 h-10 rounded-full bg-white shadow-float flex items-center justify-center">
        <RefreshCw
          size={18}
          className={`text-midnight-cherry ${spin}`}
          style={{ transform: `rotate(${rotate}deg)` }}
        />
      </div>
    </div>
  );
}