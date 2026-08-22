import React, { useState, useEffect } from 'react';
import { Gift, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

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

// Shows the customer's unlocked Star Rewards and lets them apply one to the
// order. Looks up the live Square loyalty balance by phone (works for guests).
export default function CheckoutRewardSelector({ phone, subtotal, appliedReward, onApply }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const phoneDigits = (phone || '').replace(/\D/g, '');
  const hasPhone = phoneDigits.length >= 10;

  useEffect(() => {
    if (!hasPhone) { setStatus(null); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
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
  }, [hasPhone, phone]);

  // Keep the applied discount in sync if the subtotal changes.
  useEffect(() => {
    if (!appliedReward || !status) return;
    const tier = (status.rewardTiers || []).find(t => t.id === appliedReward.tierId);
    if (!tier) return;
    const dv = computeDiscount(tier, subtotal);
    if (dv != null && dv !== appliedReward.discountValue) {
      onApply({ tierId: tier.id, discountValue: dv, description: tier.description });
    }
  }, [subtotal, status]);

  if (!hasPhone || loading || !status || !status.hasAccount) return null;

  const balance = Number(status.balance || 0);
  const rewards = (status.rewardTiers || [])
    .map(t => ({ ...t, discountValue: computeDiscount(t, subtotal) }))
    .filter(t => t.discountValue != null && t.discountValue > 0 && balance >= t.points);

  if (rewards.length === 0) return null;

  return (
    <div className="card-diner p-6">
      <div className="flex items-center gap-2 mb-1">
        <Gift size={18} className="text-patina-mint" />
        <h2 className="font-heading text-lg text-obsidian-roast">Your Rewards</h2>
        <span className="ml-auto text-xs text-muted-foreground font-heading">{balance.toLocaleString()} stars</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Apply one reward to this order — points are deducted when you pay.</p>
      <div className="space-y-2">
        {rewards.map(r => {
          const applied = appliedReward?.tierId === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onApply(applied ? null : { tierId: r.id, discountValue: r.discountValue, description: r.description })}
              className={`w-full p-4 rounded-2xl border-2 transition-all text-left flex items-center justify-between gap-3 ${
                applied
                  ? 'border-patina-mint bg-patina-mint/10'
                  : 'border-border hover:border-patina-mint/50 cursor-pointer'
              }`}
            >
              <div>
                <p className="font-heading text-sm text-obsidian-roast">{r.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.points} stars</p>
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
    </div>
  );
}