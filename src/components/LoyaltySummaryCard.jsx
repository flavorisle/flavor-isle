import React from 'react';
import { Star, Gift, ChevronRight } from 'lucide-react';

// Compact Star Rewards summary shown at the top of the Account Orders tab.
// Reads the live Square loyalty balance (status prop) — the same program used
// in-store — instead of a separate custom points ledger.
export default function LoyaltySummaryCard({ status, loading, onOpenRewards }) {
  const balance = status?.balance || 0;
  const lifetime = status?.lifetimePoints || 0;
  const programName = status?.programName || 'Flavor Isle Star Rewards';
  const earnText = status?.earnText;

  const subline = status?.hasAccount
    ? `${Number(lifetime).toLocaleString()} lifetime stars${earnText ? ` · ${earnText}` : ''}`
    : status?.needsPhone
      ? 'Add a phone number to join Star Rewards'
      : loading
        ? 'Syncing with your in-store account…'
        : 'Syncing with your in-store account';

  return (
    <div className="card-diner p-6 bg-gradient-to-br from-patina-mint to-[#14304a] text-white overflow-hidden relative">
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
      <div className="absolute -right-4 top-10 w-20 h-20 rounded-full bg-midnight-cherry/30" />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 bg-white/15 rounded-full flex items-center justify-center flex-shrink-0">
            <Star size={26} className="text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">{programName}</p>
            <p className="font-heading text-4xl leading-none mt-1">
              {loading ? '–' : Number(balance).toLocaleString()}
            </p>
            <p className="text-xs text-white/70 mt-1">{subline}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
          <div className="flex items-center gap-2 text-white/80">
            <Gift size={15} />
            <span className="text-[11px] uppercase tracking-wider">In-store & online</span>
          </div>
          <button
            onClick={onOpenRewards}
            className="flex items-center gap-2 bg-midnight-cherry hover:bg-red-800 transition-colors px-5 py-3 rounded-2xl font-heading text-sm whitespace-nowrap"
          >
            View Rewards <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}