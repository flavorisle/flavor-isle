import React from 'react';
import { cn } from '@/lib/utils';

// Price pill (issue #339). `tabular-nums` keeps the digits the same width, so a
// column of prices lines up. Display only — it never prices anything itself.
//
// A non-numeric value (a wait quote like "~20 min") is shown exactly as given
// rather than being forced through the money format.
export default function PriceChip({ amount, prefix = null, delta = false, className }) {
  const numeric = typeof amount === 'number' ? amount : Number(amount);
  const isNumber = amount !== '' && amount != null && Number.isFinite(numeric);
  const text = isNumber
    ? `${delta && numeric > 0 ? '+' : ''}$${numeric.toFixed(2)}`
    : String(amount ?? '');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 font-heading text-sm tabular-nums text-obsidian-roast',
        className,
      )}
    >
      {prefix && <span className="text-[10px] uppercase tracking-wider opacity-70">{prefix}</span>}
      {text}
    </span>
  );
}