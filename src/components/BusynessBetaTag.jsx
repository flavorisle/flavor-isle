import React from 'react';
import { useAuth } from '@/lib/AuthContext';

// The "in testing" label belongs to the crew, not to customers. It is kept so
// staff can still see which numbers are estimates while they work, and it
// renders nothing at all for anyone else — no public page shows busyness
// estimates as though they were still experimental.
export default function BusynessBetaTag({ className = '' }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') return null;

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