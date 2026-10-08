import React, { useState, useEffect } from 'react';
import { Star, Gift, Phone, TrendingUp, Award, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';

// Parses the Square accrual rule text (e.g. "Earn 1 star per $1 spent") to
// estimate how many stars this order will earn based on the subtotal.
function estimateStars(earnText, subtotal) {
  if (!earnText) return Math.max(1, Math.round(subtotal));
  const match = earnText.match(/(\d+)\s*star.*per \$(\d+)\s*spent/i);
  if (match) {
    const starsPer = parseInt(match[1], 10);
    const perDollars = parseInt(match[2], 10);
    if (perDollars > 0) return Math.floor((subtotal / perDollars) * starsPer);
  }
  return Math.max(1, Math.round(subtotal));
}

// From the program's reward tiers + the live balance, find the highest tier
// the customer has unlocked and the next one they're working toward.
function computeTier(rewardTiers, balance) {
  if (!rewardTiers || rewardTiers.length === 0) return { current: null, next: null, progress: 0 };
  const sorted = [...rewardTiers].sort((a, b) => a.points - b.points);
  let current = null;
  for (const t of sorted) {
    if (balance >= t.points) current = t;
  }
  const currentIdx = current ? sorted.indexOf(current) : -1;
  const next = currentIdx >= 0 && currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : sorted[0];
  const span = next ? next.points - (current?.points || 0) : 0;
  const progress = next && span > 0
    ? Math.min(100, Math.round(((balance - (current?.points || 0)) / span) * 100))
    : current ? 100 : 0;
  return { current, next, progress };
}

// Compute a dollar discount for a Square reward tier against the order subtotal.
// Only order-level FIXED_AMOUNT and FIXED_PERCENTAGE (<100%) tiers are redeemable
// online; item-scoped / free-item / fixed-price tiers are skipped.
function computeDiscount(tier, subtotal) {
  if (!tier) return null;
  if (tier.scope && tier.scope !== 'ORDER') return null;
  if (tier.discountType === 'FIXED_AMOUNT') {
    const v = (tier.fixedAmountCents || 0) / 100;
    return v > 0 ? Math.min(subtotal, +v.toFixed(2)) : null;
  }
  if (tier.discountType === 'FIXED_PERCENTAGE') {
    const pct = tier.percentage || 0;
    if (pct <= 0 || pct >= 100) return null;
    return +(subtotal * pct / 100).toFixed(2);
  }
  return null;
}

// Merged Star Rewards panel for checkout. Does a single live Square loyalty
// lookup by phone (works for guests and signed-in members) and shows the
// balance, tier progress, stars-earned estimate, and — when showRewards is
// true — the redeemable rewards the customer can apply to this order.
export default function CheckoutRewardsPanel({ subtotal, phone, appliedReward, onApply, showRewards = true }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);

  const phoneDigits = (phone || '').replace(/\D/g, '');
  const hasPhone = phoneDigits.length >= 10;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setStatus(null);

    // Phone entered — look up Star Rewards by that phone regardless of login.
    if (hasPhone) {
      const timer = setTimeout(async () => {
        try {
          const res = await base44.functions.invoke('squareLoyalty', { action: 'status', phone });
          if (!cancelled) setStatus(res.data);
        } catch {
          if (!cancelled) setStatus(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      }, 400);
      return () => { cancelled = true; clearTimeout(timer); };
    }

    // No phone yet — fall back to the signed-in customer's saved profile phone.
    (async () => {
      const authed = await base44.auth.isAuthenticated().catch(() => false);
      if (!authed) { if (!cancelled) { setIsGuest(true); setLoading(false); } return; }
      if (cancelled) return;
      setIsGuest(false);
      try {
        const res = await base44.functions.invoke('squareLoyalty', { action: 'status' });
        if (!cancelled) setStatus(res.data);
      } catch {
        if (!cancelled) setStatus(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [hasPhone, phone]);

  // Keep the applied discount in sync if the subtotal changes.
  useEffect(() => {
    if (!appliedReward || !status || !onApply) return;
    const tier = (status.rewardTiers || []).find(t => t.id === appliedReward.tierId);
    if (!tier) return;
    const dv = computeDiscount(tier, subtotal);
    if (dv != null && dv !== appliedReward.discountValue) {
      onApply({ tierId: tier.id, discountValue: dv, description: tier.description });
    }
  }, [subtotal, status]);

  if (loading) {
    return (
      <div className="card-diner p-4 flex items-center gap-3">
        <div className="w-9 h-9 bg-smashie-yellow/15 rounded-full flex items-center justify-center flex-shrink-0">
          <Star size={16} className="text-smashie-yellow" />
        </div>
        <p className="text-sm text-muted-foreground">Checking your Star Rewards…</p>
      </div>
    );
  }

  const s = status || {};
  const balance = Number(s.balance || 0);
  const estStars = estimateStars(s.earnText, subtotal);
  const { current, next, progress } = computeTier(s.rewardTiers, balance);

  // Redeemable order-level rewards the customer has unlocked.
  const rewards = showRewards && s.hasAccount
    ? (s.rewardTiers || [])
        .map(t => ({ ...t, discountValue: computeDiscount(t, subtotal) }))
        .filter(t => t.discountValue != null && t.discountValue > 0 && balance >= t.points)
    : [];

  // ── Nudge states: no account to show rewards for ──────────────────────
  // Phone entered but no rewards account found for that number.
  if (hasPhone && !s.hasAccount) {
    return (
      <div className="card-diner p-4 bg-gradient-to-r from-smashie-yellow/10 to-patina-mint/5 border border-smashie-yellow/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-smashie-yellow/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Star size={20} className="text-smashie-yellow" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-sm text-obsidian-roast">Earn ~{estStars} stars on this order!</p>
            <p className="text-xs text-muted-foreground leading-snug">No rewards account found for this number yet — create a free account to start earning Star Rewards, same as in-store.</p>
          </div>
          <Link to="/register" className="btn-cherry chrome-hover px-4 py-2.5 text-xs font-heading whitespace-nowrap tap-44 flex-shrink-0">
            Join Free
          </Link>
        </div>
      </div>
    );
  }

  // No phone entered — guest nudge.
  if (isGuest && !s.hasAccount) {
    return (
      <div className="card-diner p-4 bg-gradient-to-r from-smashie-yellow/10 to-patina-mint/5 border border-smashie-yellow/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-smashie-yellow/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Star size={20} className="text-smashie-yellow" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-sm text-obsidian-roast">Earn ~{estStars} stars on this order!</p>
            <p className="text-xs text-muted-foreground leading-snug">Enter your phone number or create a free account to start earning Star Rewards — same rewards as in-store.</p>
          </div>
          <Link to="/register" className="btn-cherry chrome-hover px-4 py-2.5 text-xs font-heading whitespace-nowrap tap-44 flex-shrink-0">
            Join Free
          </Link>
        </div>
      </div>
    );
  }

  // Signed in, no phone typed, needs phone to link loyalty.
  if (s.needsPhone) {
    return (
      <div className="card-diner p-4 flex items-center gap-3 border border-amber-200 bg-amber-50/50">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Phone size={18} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm text-obsidian-roast">Add your phone to earn stars</p>
          <p className="text-xs text-muted-foreground leading-snug">Star Rewards links to your phone number — enter it above to link your rewards.</p>
        </div>
      </div>
    );
  }

  // Signed in but loyalty not yet active/available.
  if (!s.hasAccount) {
    return (
      <div className="card-diner p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-smashie-yellow/15 rounded-full flex items-center justify-center flex-shrink-0">
          <Gift size={18} className="text-smashie-yellow" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm text-obsidian-roast">Flavor Isle Star Rewards</p>
          <p className="text-xs text-muted-foreground leading-snug">Earn rewards on every order — in-store and online.</p>
        </div>
      </div>
    );
  }

  // ── Active account: merged balance + rewards card ──────────────────────
  return (
    <div className="card-diner p-6 bg-gradient-to-r from-patina-mint/8 to-midnight-cherry/5 border border-patina-mint/20">
      {/* Balance + tier + progress header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-patina-mint/15 rounded-full flex items-center justify-center flex-shrink-0">
          <Award size={18} className="text-patina-mint" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm text-obsidian-roast">{balance.toLocaleString()} stars available</p>
          <p className="text-xs text-muted-foreground leading-snug">
            {current ? `Tier: ${current.name} — ${current.description}` : 'No reward tier unlocked yet'}
            {s.earnText ? ` · ${s.earnText}` : ''}
          </p>
        </div>
      </div>

      {next ? (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{Math.max(0, next.points - balance)} stars to {next.name}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-patina-mint rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : current ? (
        <p className="text-xs text-patina-mint font-heading mb-3">Highest tier reached — you're a legend! 🏆</p>
      ) : null}

      <p className="text-xs text-midnight-cherry font-heading mb-4">This order earns ~{estStars} stars ⭐</p>

      {/* Redeemable rewards (details step only) */}
      {showRewards && rewards.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-1 pt-3 border-t border-patina-mint/15">
            <Gift size={16} className="text-patina-mint" />
            <h2 className="font-heading text-sm text-obsidian-roast">Your Rewards</h2>
            <span className="ml-auto text-xs text-muted-foreground font-heading">{balance.toLocaleString()} stars</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Apply one reward to this order — points are deducted when you pay.</p>
          <div className="space-y-2">
            {rewards.map(r => {
              const applied = appliedReward?.tierId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => onApply?.(applied ? null : { tierId: r.id, discountValue: r.discountValue, description: r.description })}
                  className={`w-full p-3 rounded-2xl border-2 transition-all text-left flex items-center justify-between gap-3 ${
                    applied
                      ? 'border-patina-mint bg-patina-mint/10'
                      : 'border-border hover:border-patina-mint/50 cursor-pointer'
                  }`}
                >
                  <div>
                    <p className="font-heading text-sm text-obsidian-roast">{r.name || r.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.description} · {r.points} stars</p>
                  </div>
                  <span className={`flex items-center gap-1.5 flex-shrink-0 text-sm font-heading px-3 py-1.5 rounded-lg ${
                    applied ? 'bg-patina-mint text-white' : 'bg-patina-mint/15 text-patina-mint'
                  }`}>
                    {applied ? (<><Check size={14} /> Applied</>) : `−$${r.discountValue.toFixed(2)}`}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}