import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Computes the dollar discount for an order-level Square reward tier.
// Item-scoped / free-item / 100%-off tiers return null (in-store only).
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

// Compact Star Rewards box for checkout — shows the live points balance and
// a list of unlocked rewards. Online-redeemable rewards get an apply button;
// in-store-only rewards are tagged so the customer knows what they've earned.
export default function CheckoutLoyaltyBox({ subtotal, phone, appliedReward, onApply }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const phoneDigits = (phone || '').replace(/\D/g, '');
  const hasPhone = phoneDigits.length >= 10;

  useEffect(() => {
    let cancelled = false;
    if (!hasPhone) { setStatus(null); setLoading(false); return; }
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
    if (!appliedReward || !status || !onApply) return;
    const tier = (status.rewardTiers || []).find(t => t.id === appliedReward.tierId);
    if (!tier) return;
    const dv = computeDiscount(tier, subtotal);
    if (dv != null && dv !== appliedReward.discountValue) {
      onApply({ tierId: tier.id, discountValue: dv, description: tier.description });
    }
  }, [subtotal, status]);

  if (!hasPhone) return null;

  if (loading) {
    return (
      <div className="card-diner p-3 flex items-center gap-2">
        <Star size={14} className="text-smashie-yellow animate-pulse" />
        <p className="text-xs text-muted-foreground">Checking Star Rewards…</p>
      </div>
    );
  }

  const s = status || {};
  const balance = Number(s.balance || 0);

  // No account found for this phone — don't show the box.
  if (!s.hasAccount) return null;

  // All reward tiers the customer has unlocked (balance >= points).
  const unlocked = (s.rewardTiers || [])
    .filter(t => balance >= t.points)
    .sort((a, b) => a.points - b.points);

  return (
    <div className="card-diner p-3 border border-patina-mint/20 bg-patina-mint/5">
      <div className="flex items-center gap-2 mb-2">
        <Star size={14} className="text-smashie-yellow" fill="currentColor" />
        <span className="font-heading text-sm text-obsidian-roast">{balance.toLocaleString()} stars</span>
        {s.earnText && <span className="text-[10px] text-muted-foreground ml-auto">{s.earnText}</span>}
      </div>
      {unlocked.length === 0 ? (
        <p className="text-xs text-muted-foreground">No rewards unlocked yet — keep earning stars!</p>
      ) : (
        <div className="space-y-1">
          {unlocked.map(r => {
            const dv = computeDiscount(r, subtotal);
            const onlineRedeemable = dv != null && dv > 0;
            const applied = onlineRedeemable && appliedReward?.tierId === r.id;
            return (
              <div
                key={r.id}
                className={`flex items-center justify-between gap-2 p-1.5 rounded-lg ${
                  applied ? 'bg-patina-mint/10 border border-patina-mint' : 'border border-border'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-heading text-obsidian-roast truncate">{r.description || r.name}</p>
                  <p className="text-[10px] text-muted-foreground">{r.points} stars</p>
                </div>
                {onlineRedeemable ? (
                  <button
                    onClick={() =>
                      onApply?.(applied ? null : { tierId: r.id, discountValue: dv, description: r.description })
                    }
                    className={`flex-shrink-0 text-xs font-heading px-2 py-1 rounded transition-colors ${
                      applied ? 'bg-patina-mint text-white' : 'bg-patina-mint/15 text-patina-mint hover:bg-patina-mint/25'
                    }`}
                  >
                    {applied ? '✓ Applied' : `−$${dv.toFixed(2)}`}
                  </button>
                ) : (
                  <span className="flex-shrink-0 text-[10px] text-muted-foreground italic">in-store</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}