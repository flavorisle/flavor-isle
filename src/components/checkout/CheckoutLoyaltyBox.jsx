import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { computeDiscount, tierNeedsCartItem } from '@/lib/rewardDiscount';

export default function CheckoutLoyaltyBox({ subtotal, phone, cartItems, appliedReward, onApply }) {
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

  useEffect(() => {
    if (!appliedReward || !status || !onApply) return;
    const tier = (status.rewardTiers || []).find(t => t.id === appliedReward.tierId);
    if (!tier) return;
    const dv = computeDiscount(tier, subtotal, cartItems);
    if (dv != null && dv !== appliedReward.discountValue) {
      onApply({ tierId: tier.id, discountValue: dv, description: tier.description });
    }
  }, [subtotal, status, cartItems]);

  if (!hasPhone || loading) return null;

  const s = status || {};
  const balance = Number(s.balance || 0);
  if (!s.hasAccount) return null;

  const affordable = (s.rewardTiers || []).filter(t => balance >= t.points);
  const redeemable = affordable
    .map(t => ({ ...t, discountValue: computeDiscount(t, subtotal, cartItems) }))
    .filter(t => t.discountValue != null && t.discountValue > 0)
    .sort((a, b) => a.points - b.points);
  // Item-scoped rewards whose qualifying item isn't in the bag yet: shown, but
  // not selectable.
  const needsItem = affordable
    .filter(t => tierNeedsCartItem(t, cartItems))
    .sort((a, b) => a.points - b.points);

  const discountLabel = (t) => {
    if (t.discountType === 'FIXED_PERCENTAGE') return `${t.percentage}% off`;
    if (t.discountType === 'FIXED_AMOUNT') return `$${((t.fixedAmountCents || 0) / 100).toFixed(0)} off`;
    return t.description || t.name || 'Reward';
  };

  return (
    <div className="border-t border-border pt-3 mb-3 space-y-1.5">
      <h3 className="font-heading text-sm text-obsidian-roast flex items-center gap-1">
        <Star size={13} className="text-smashie-yellow" fill="currentColor" /> Star Rewards
        <span className="text-xs text-muted-foreground font-body ml-1">· {balance.toLocaleString()} stars</span>
        <Link to="/rewards" className="ml-auto text-xs text-patina-mint hover:text-midnight-cherry transition-colors font-body">Learn more</Link>
      </h3>
      {(redeemable.length > 0 || needsItem.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {redeemable.map(r => {
            const applied = appliedReward?.tierId === r.id;
            return (
              <button
                key={r.id}
                onClick={() => onApply?.(applied ? null : { tierId: r.id, discountValue: r.discountValue, description: r.description })}
                className={`px-2 py-0.5 rounded-full font-heading transition-colors ${
                  applied ? 'bg-patina-mint text-white' : 'bg-patina-mint/10 text-patina-mint hover:bg-patina-mint/20'
                }`}
              >
                {applied ? `✓ ${r.name || discountLabel(r)} applied` : `Redeem ${r.name || discountLabel(r)}`}
              </button>
            );
          })}
          {needsItem.map(t => (
            <span
              key={t.id}
              className="px-2 py-0.5 rounded-full text-xs font-heading bg-muted text-muted-foreground"
              title={`${t.name || discountLabel(t)} — ${t.points} stars`}
            >
              {t.name || discountLabel(t)} · Add a qualifying item to use
            </span>
          ))}
        </div>
      )}
    </div>
  );
}