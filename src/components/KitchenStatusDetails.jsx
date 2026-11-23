import React from 'react';
import { Flame } from 'lucide-react';

export default function KitchenStatusDetails({ activeCount, wait, loading }) {
  const orders = Math.max(0, Number(activeCount) || 0);
  // Only the live estimate is shown — never a stage range — so the bar carries
  // one wait number that matches the order button.
  const waitLabel = wait || '';

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs sm:text-sm text-muted-foreground">
      <Flame size={14} className="flex-shrink-0 text-smashie-yellow" aria-hidden="true" />
      {loading ? <span>Checking the grill…</span> : (
        <>
          <span>{orders === 0 ? 'Kitchen is clear' : `${orders} order${orders === 1 ? '' : 's'} in progress`}</span>
          {waitLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span>wait {waitLabel}</span>
            </>
          )}
        </>
      )}
    </p>
  );
}