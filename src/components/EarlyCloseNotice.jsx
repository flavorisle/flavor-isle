import React from 'react';
import { AlertCircle } from 'lucide-react';
import useStoreClosure from '@/hooks/useStoreClosure';

// Dynamic full-day closure banner. Reads the admin-configured closure from
// MenuSetting (set via the Admin Dashboard "Emergency Closure" panel) so the
// site reflects whatever the admin schedules — no hardcoded dates.
export default function EarlyCloseNotice() {
  const { closed, message, loading } = useStoreClosure();
  if (loading || !closed) return null;

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