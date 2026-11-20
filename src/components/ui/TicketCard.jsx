import React from 'react';
import { cn } from '@/lib/utils';
import PriceChip from './PriceChip';

// The diner kitchen-ticket card (issue #339): a perforated top edge, the name in
// the site's mono stack, a dotted leader running to the price, then whatever the
// caller puts in the body.
//
// Renders a real <button> when onClick is given (so the whole row is one
// keyboard-reachable target) and a plain <div> otherwise — never a button
// wrapping other buttons.
export default function TicketCard({ title, subtitle, price, meta, leading, onClick, children, className }) {
  const Tag = onClick ? 'button' : 'div';
  // `price` may be a number (priced by PriceChip) or a node the caller built,
  // e.g. a Happy Hour chip beside the struck-through original.
  const priceNode = price == null
    ? null
    : (React.isValidElement(price) ? price : <PriceChip amount={price} />);

  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={cn(
        'relative block w-full rounded-2xl border border-border bg-white px-4 pb-4 pt-4 text-left shadow-[0_2px_10px_rgba(0,0,0,0.06)]',
        onClick && 'motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:-translate-y-0.5 hover:border-midnight-cherry/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-cherry focus-visible:ring-offset-2',
        className,
      )}
    >
      {/* Perforated top edge — drawn in CSS only, no image. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 right-3 top-2 h-[2px]"
        style={{ backgroundImage: 'repeating-linear-gradient(90deg, hsl(var(--border)) 0 6px, transparent 6px 12px)' }}
      />

      <div className="flex items-start gap-3">
        {leading && <div className="flex-shrink-0">{leading}</div>}
        <div className="min-w-0 flex-1">
          {meta && <div className="mb-1 flex flex-wrap items-center gap-1.5">{meta}</div>}
          {(title || priceNode) && (
            <div className="flex items-baseline gap-2">
              {title && (
                <h3 className="break-words font-mono text-[15px] font-semibold leading-tight text-obsidian-roast">
                  {title}
                </h3>
              )}
              {title && priceNode && (
                <span aria-hidden="true" className="min-w-4 flex-1 -translate-y-1 border-b border-dotted border-border" />
              )}
              {priceNode && <span className="flex-shrink-0">{priceNode}</span>}
            </div>
          )}
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>

      {children && <div className="mt-2">{children}</div>}
    </Tag>
  );
}