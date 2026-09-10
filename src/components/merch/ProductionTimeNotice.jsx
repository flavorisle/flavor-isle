// Reusable production-time notice for Tasty Threads merch.
// Printful prints on demand: ~2–7 business days production + shipping.
import React from 'react';
import { Clock, Package } from 'lucide-react';

const PRODUCTION_MIN = 2;
const PRODUCTION_MAX = 7;
const SHIPPING_MIN = 2;
const SHIPPING_MAX = 5;

export const PRODUCTION_RANGE = `${PRODUCTION_MIN}–${PRODUCTION_MAX} business days`;
export const SHIPPING_RANGE = `${SHIPPING_MIN}–${SHIPPING_MAX} business days`;
export const TOTAL_RANGE = `${PRODUCTION_MIN + SHIPPING_MIN}–${PRODUCTION_MAX + SHIPPING_MAX} business days`;

// Compact inline badge — for product cards and tight spaces.
export function ProductionTimeBadge({ className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-heading uppercase tracking-widest text-patina-mint bg-patina-mint/10 px-2 py-1 rounded-full ${className}`}
      title={`Production ${PRODUCTION_RANGE}, then shipping`}
    >
      <Clock size={10} /> Made to order
    </span>
  );
}

// Full notice block — for product detail modal and checkout summary.
export default function ProductionTimeNotice({ variant = 'default', className = '' }) {
  const isCompact = variant === 'compact';
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl ${
        isCompact ? 'p-3 bg-muted' : 'p-4 bg-patina-mint/5 border border-patina-mint/15'
      } ${className}`}
    >
      <div className={`flex-shrink-0 rounded-full flex items-center justify-center ${
        isCompact ? 'w-8 h-8 bg-patina-mint/15' : 'w-10 h-10 bg-patina-mint/15'
      }`}>
        <Package size={isCompact ? 15 : 18} className="text-patina-mint" />
      </div>
      <div className="min-w-0">
        <p className={`font-heading text-obsidian-roast ${isCompact ? 'text-xs' : 'text-sm'}`}>
          Printed on demand · ships in {TOTAL_RANGE}
        </p>
        <p className={`text-muted-foreground ${isCompact ? 'text-[11px]' : 'text-xs'} mt-0.5 leading-snug`}>
          Each item is made just for you. Production takes {PRODUCTION_RANGE}, then {SHIPPING_RANGE} for shipping. You'll get a tracking number by email once it ships.
        </p>
      </div>
    </div>
  );
}