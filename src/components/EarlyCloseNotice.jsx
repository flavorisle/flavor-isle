import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import useStoreClosure from '@/hooks/useStoreClosure';
import { formatClock } from '@/lib/storeState';

// Day banner: a full temporary closure in cherry red, or a one-day early close
// in yellow. Both come from the admin settings record, so the site says exactly
// what Smashie tells callers on the phone.
export default function EarlyCloseNotice() {
  const { closed, message, earlyClose, loading } = useStoreClosure();
  if (loading) return null;

  if (closed) {
    return (
      <div className="bg-midnight-cherry text-white px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center">
          <AlertCircle size={18} className="flex-shrink-0 text-smashie-yellow" />
          <p className="text-sm font-body">
            <span className="font-heading tracking-wide">CLOSED TODAY</span>
            <span className="opacity-90"> — {message || "we're closed today"}. We'll be back to normal soon!</span>
          </p>
        </div>
      </div>
    );
  }

  if (!earlyClose) return null;

  return (
    <div className="bg-smashie-yellow text-patina-mint px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center">
        <Clock size={18} className="flex-shrink-0" />
        <p className="text-sm font-body">
          <span className="font-heading tracking-wide">CLOSING EARLY TODAY</span>
          <span className="opacity-90">
            {' '}— last orders before {formatClock(earlyClose.closeTime)}.
            {earlyClose.message ? ` ${earlyClose.message}` : ''}
          </span>
        </p>
      </div>
    </div>
  );
}