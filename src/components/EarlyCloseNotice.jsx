import React from 'react';
import { AlertCircle, Clock } from 'lucide-react';
import useStoreClosure from '@/hooks/useStoreClosure';
import { chicagoTodayKey, formatClock } from '@/lib/storeState';

// Day banner: a full temporary closure in cherry red, or a one-day early close
// in yellow. Both come from the admin settings record, so the site says exactly
// what Smashie tells callers on the phone.
//
// The early-close line is never taken from a free-typed time: it is built from
// the saved close_time and the ordering cutoff, so the banner and the order page
// can't disagree about when the kitchen stops taking orders.

function minutesOf(time) {
  const [h, m] = String(time || '').split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
}

function clockFromMinutes(mins) {
  if (mins == null) return '';
  const hour = Math.floor(mins / 60);
  const minute = mins % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

// Last moment an order can be placed: the close time minus the ordering cutoff.
function lastOrdersTime(closeTime, cutoffMinutes) {
  const closeMins = minutesOf(closeTime);
  if (closeMins == null) return '';
  const cutoff = Number.isFinite(Number(cutoffMinutes)) ? Math.max(0, Number(cutoffMinutes)) : 15;
  return clockFromMinutes(Math.max(0, closeMins - cutoff));
}

export default function EarlyCloseNotice() {
  const { closed, message, earlyClose, pickupCutoff, loading } = useStoreClosure();
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

  // Only an early close dated today may render — a stale record from a past day
  // never reaches the public site.
  if (!earlyClose || earlyClose.date !== chicagoTodayKey()) return null;

  const lastOrders = lastOrdersTime(earlyClose.closeTime, pickupCutoff);

  return (
    <div className="bg-smashie-yellow text-patina-mint px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center">
        <Clock size={18} className="flex-shrink-0" />
        <p className="text-sm font-body">
          <span className="font-heading tracking-wide">CLOSING EARLY TODAY</span>
          <span className="opacity-90">
            {' '}— we close at {formatClock(earlyClose.closeTime)}
            {lastOrders ? `, and last orders are ${formatClock(lastOrders)}` : ''}.
            {earlyClose.message ? ` ${earlyClose.message}` : ''}
          </span>
        </p>
      </div>
    </div>
  );
}