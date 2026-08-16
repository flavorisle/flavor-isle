import React from 'react';
import { AlertCircle } from 'lucide-react';

// Temporary one-day notice: closing early at 5pm on 2026-08-16 due to
// maintenance and the heat. Auto-hides on any other date.
export default function EarlyCloseNotice() {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  if (today !== '2026-08-16') return null;

  return (
    <div className="bg-midnight-cherry text-white px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center">
        <AlertCircle size={18} className="flex-shrink-0 text-smashie-yellow" />
        <p className="text-sm font-body">
          <span className="font-heading tracking-wide">CLOSED TODAY</span>
          <span className="opacity-90"> — we're completely closed today (Sunday) for maintenance and to beat the heat. We'll be back to normal tomorrow!</span>
        </p>
      </div>
    </div>
  );
}