import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Gift, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Star Rewards on the order confirmation page: the customer's live in-store
// balance and how many stars stand between them and their next reward tier.
// Not signed in / not enrolled simply sees a one-tap join prompt.
export default function OrderLoyaltyCard() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.analytics.track({ eventName: 'loyalty_prompt_shown' });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke('squareLoyalty', { action: 'status' });
        if (!cancelled) setStatus(res?.data || null);
      } catch {
        // Guests (and a lookup that fails) fall back to the join prompt.
        if (!cancelled) setStatus(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const enrolled = status?.hasAccount === true;
  const balance = Number(status?.balance || 0);
  const programName = status?.programName || 'Flavor Isle Star Rewards';

  // Reward tiers arrive in no guaranteed order and a tier with 0 points is not
  // a next step, so only the smallest reachable tier above the balance counts.
  const tiers = (status?.rewardTiers || [])
    .map((t) => ({ ...t, points: Number(t.points) || 0 }))
    .filter((t) => t.points > 0)
    .sort((a, b) => a.points - b.points);
  const nextTier = enrolled ? tiers.find((t) => t.points > balance) || null : null;
  const remaining = nextTier ? nextTier.points - balance : 0;
  const progress = nextTier ? Math.min(100, Math.round((balance / nextTier.points) * 100)) : 0;

  return (
    <div className="card-diner p-6 mb-8 bg-gradient-to-br from-patina-mint to-[#14304a] text-white overflow-hidden relative text-left">
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
      <div className="absolute -right-4 top-10 w-20 h-20 rounded-full bg-midnight-cherry/30" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-white/15 rounded-full flex items-center justify-center flex-shrink-0">
            <Star size={22} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-lg leading-tight">Your Star Rewards</p>
            <p className="text-[11px] uppercase tracking-widest text-white/60 font-semibold">{programName}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-white/70">Syncing with your in-store account…</p>
        ) : !enrolled ? (
          <>
            <p className="text-sm text-white/85">
              Earn stars on every order — the same rewards you already earn in-store, redeemable for free food.
            </p>
            <Link
              to="/rewards"
              className="mt-4 inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-midnight-cherry hover:bg-red-800 transition-colors px-5 py-3 rounded-2xl font-heading text-sm"
            >
              <Gift size={16} /> Join Star Rewards <ChevronRight size={15} />
            </Link>
          </>
        ) : (
          <>
            <p className="font-heading text-4xl leading-none">{balance.toLocaleString()}</p>
            <p className="text-xs text-white/70 mt-1">stars available to redeem</p>

            {nextTier ? (
              <div className="mt-4">
                <p className="text-xs text-white/85 mb-2">
                  <span className="font-heading text-base text-smashie-yellow">{remaining.toLocaleString()}</span>{' '}
                  more {remaining === 1 ? 'star' : 'stars'} to unlock{' '}
                  <span className="text-white font-semibold">{nextTier.name}</span>
                </p>
                <div
                  className="h-3 rounded-full bg-white/15 overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={nextTier.points}
                  aria-valuenow={balance}
                  aria-label={`${balance} of ${nextTier.points} stars toward ${nextTier.name}`}
                >
                  <div
                    className="h-full rounded-full bg-smashie-yellow transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 mt-1.5 text-[11px] text-white/60">
                  <span>{balance.toLocaleString()} stars</span>
                  <span className="font-heading text-smashie-yellow">{progress}% of the way</span>
                  <span>{nextTier.points.toLocaleString()} stars · {nextTier.name}</span>
                </div>
                {nextTier.description && (
                  <p className="text-[11px] text-white/70 mt-2">{nextTier.description}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-white/80 mt-4">
                {tiers.length ? "You've unlocked our top reward — treat yourself." : 'Keep ordering to earn stars.'}
              </p>
            )}

            <Link
              to="/rewards"
              className="mt-4 inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-midnight-cherry hover:bg-red-800 transition-colors px-5 py-3 rounded-2xl font-heading text-sm"
            >
              View Rewards <ChevronRight size={15} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}