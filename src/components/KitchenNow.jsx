import React from 'react';
import { Flame, ChefHat } from 'lucide-react';
import useLiveStatus from '@/hooks/useLiveStatus';

// Issue #340 (D1) — a read-only strip showing what the grill is doing.
//
// Every number here is read, never guessed: orders in progress and the wait come
// from the same live busyness read the What to Expect page publishes
// (useLiveStatus → getBusyness, which counts the live Order rows), and the wait
// wording is that busyness level's own waitRange. When the store is closed the
// closed message replaces the wait — no estimate is ever shown for a closed
// kitchen. Read-only: nothing here writes.
const CLOSED_COPY = "We're closed right now. Online ordering opens back up before we open for pickup.";

export default function KitchenNow({ compact = false }) {
  const { level, isClosed, activeCount, loading, wait, closureMessage } = useLiveStatus();

  const orders = Math.max(0, Number(activeCount) || 0);
  const ordersLabel = orders === 0
    ? 'Kitchen is clear'
    : `${orders} order${orders === 1 ? '' : 's'} in progress`;
  // The level's own published wording — never a new number.
  const waitLabel = level?.waitRange || wait || '';
  const closedLabel = closureMessage ? `We're closed right now — ${closureMessage}` : CLOSED_COPY;

  if (compact) {
    return (
      <div className="bg-patina-mint text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-center gap-x-2 gap-y-1 flex-wrap text-xs sm:text-sm">
          <Flame size={14} className="text-smashie-yellow flex-shrink-0" aria-hidden="true" />
          {loading ? (
            <span className="text-white/80">Checking the grill…</span>
          ) : isClosed ? (
            <span className="text-white/85">{closedLabel}</span>
          ) : (
            <>
              <span className="font-heading uppercase tracking-wider">{level?.level || 'Open'}</span>
              <span className="text-white/40" aria-hidden="true">·</span>
              <span className="text-white/85">{ordersLabel}</span>
              {waitLabel && (
                <>
                  <span className="text-white/40" aria-hidden="true">·</span>
                  <span className="text-white/85">wait {waitLabel}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <ChefHat size={16} className="text-midnight-cherry" aria-hidden="true" />
        <p className="font-heading text-xs uppercase tracking-[0.2em] text-obsidian-roast">On the grill now</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Checking the grill…</p>
      ) : isClosed ? (
        <p className="text-sm text-muted-foreground">{closedLabel}</p>
      ) : (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Right now</p>
            <p className="font-heading text-base text-obsidian-roast leading-tight">{level?.level || 'Open'}</p>
          </div>
          <div>
            <p className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">In progress</p>
            <p className="font-heading text-base text-obsidian-roast leading-tight">{orders}</p>
          </div>
          <div>
            <p className="font-heading text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Wait</p>
            <p className="font-heading text-base text-midnight-cherry leading-tight">{waitLabel || '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
}