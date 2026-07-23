import React from 'react';
import { Zap, Gift, TrendingUp, ChevronRight } from 'lucide-react';

const TIER_BLURB = {
  gold: '2× points per order',
  silver: '1.5× points per order',
  bronze: 'Standard rewards',
};

export default function LoyaltySummaryCard({ loyalty, redemptions, onOpenRewards }) {
  const balance = loyalty?.points_balance || 0;
  const earned = loyalty?.points_earned || 0;
  const tier = loyalty?.tier || 'bronze';

  const recent = (redemptions || [])
    .slice()
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 3);

  return (
    <div className="card-diner p-6 bg-gradient-to-br from-patina-mint to-[#14304a] text-white overflow-hidden relative">
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
      <div className="absolute -right-4 top-10 w-20 h-20 rounded-full bg-midnight-cherry/30" />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
        {/* Balance */}
        <div className="flex items-center gap-4 flex-1">
          <div className="w-14 h-14 bg-white/15 rounded-full flex items-center justify-center flex-shrink-0">
            <Zap size={26} className="text-white" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">Loyalty Points</p>
            <p className="font-heading text-4xl leading-none mt-1">{balance.toLocaleString()}</p>
            <p className="text-xs text-white/70 mt-1 capitalize">
              {tier} tier · {TIER_BLURB[tier] || TIER_BLURB.bronze}
            </p>
          </div>
        </div>

        {/* Earned + rewards button */}
        <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
          <div className="text-center">
            <div className="flex items-center gap-1.5 justify-center text-white/80">
              <TrendingUp size={15} />
              <p className="font-heading text-xl">{earned.toLocaleString()}</p>
            </div>
            <p className="text-[11px] uppercase tracking-wider text-white/60 mt-0.5">Total Earned</p>
          </div>
          <button
            onClick={onOpenRewards}
            className="flex items-center gap-2 bg-midnight-cherry hover:bg-red-800 transition-colors px-5 py-3 rounded-2xl font-heading text-sm whitespace-nowrap"
          >
            <Gift size={15} /> Redeem <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Recent reward activity */}
      <div className="relative mt-6 pt-5 border-t border-white/15">
        <p className="text-xs uppercase tracking-widest text-white/70 font-semibold mb-3">Recent Reward Activity</p>
        {recent.length === 0 ? (
          <p className="text-sm text-white/60 italic">No reward activity yet — earn points with every order!</p>
        ) : (
          <div className="space-y-2">
            {recent.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50 flex-shrink-0" />
                  <span className="truncate text-white/90">{r.description}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-white/60 text-xs">
                    {new Date(r.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-heading ${
                    r.is_redeemed ? 'bg-white/10 text-white/60' : 'bg-white/20 text-white'
                  }`}>
                    {r.is_redeemed ? 'Used' : `−${r.points_cost} pts`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}