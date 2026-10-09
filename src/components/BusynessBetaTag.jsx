import React from 'react';

// Shared "in testing" label for every public busyness / wait-time display, so
// our estimates are never presented as exact. The phone-width status bar has no
// room for the full phrase next to the live order CTA, so it shortens to
// "In testing" there; the full wording ships from 640px up and is always in the
// tooltip for screen readers and hover.
export default function BusynessBetaTag({ className = '' }) {
  return (
    <span
      title="In testing — estimates only"
      className={`inline-flex items-center flex-shrink-0 bg-muted text-muted-foreground text-[10px] font-heading uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}
    >
      <span className="sm:hidden">In testing</span>
      <span className="hidden sm:inline">In testing — estimates only</span>
    </span>
  );
}