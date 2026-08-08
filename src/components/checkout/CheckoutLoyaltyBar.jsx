import React, { useState, useEffect } from 'react';
import { Star, Gift, Phone, TrendingUp } from 'lucide-react';
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

// Compact loyalty strip for the checkout details step.
// - Guests: nudge to create an account to earn Star Rewards on this order
// - Signed-in, no phone: prompt to add phone (loyalty is keyed by phone)
// - Signed-in with loyalty: show stars-earned preview + current balance
export default function CheckoutLoyaltyBar({ subtotal }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => {
    let cancelled = false;
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
  }, []);

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

  // Guest — earn-rewards nudge with estimated stars for this order
  if (isGuest) {
    const estStars = Math.max(1, Math.round(subtotal));
    return (
      <div className="card-diner p-4 bg-gradient-to-r from-smashie-yellow/10 to-patina-mint/5 border border-smashie-yellow/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-smashie-yellow/20 rounded-full flex items-center justify-center flex-shrink-0">
            <Star size={20} className="text-smashie-yellow" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-sm text-obsidian-roast">Earn ~{estStars} stars on this order!</p>
            <p className="text-xs text-muted-foreground leading-snug">Create a free account to start earning Star Rewards — same rewards as in-store.</p>
          </div>
          <Link to="/register" className="btn-cherry chrome-hover px-4 py-2.5 text-xs font-heading whitespace-nowrap tap-44 flex-shrink-0">
            Join Free
          </Link>
        </div>
      </div>
    );
  }

  // Signed in but needs phone to link loyalty
  if (status?.needsPhone) {
    return (
      <div className="card-diner p-4 flex items-center gap-3 border border-amber-200 bg-amber-50/50">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Phone size={18} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm text-obsidian-roast">Add your phone to earn stars</p>
          <p className="text-xs text-muted-foreground leading-snug">Star Rewards links to your phone number — add it in your profile to earn on every order.</p>
        </div>
        <Link to="/account" className="btn-cherry chrome-hover px-4 py-2.5 text-xs font-heading whitespace-nowrap tap-44 flex-shrink-0">
          Add Phone
        </Link>
      </div>
    );
  }

  // Signed in with active loyalty account — stars-earned preview
  if (status?.hasAccount) {
    const earnText = status.earnText;
    const estStars = estimateStars(earnText, subtotal);
    const balance = status.balance || 0;
    return (
      <div className="card-diner p-4 bg-gradient-to-r from-patina-mint/8 to-midnight-cherry/5 border border-patina-mint/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-patina-mint/15 rounded-full flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-patina-mint" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-sm text-obsidian-roast">This order earns ~{estStars} stars ⭐</p>
            <p className="text-xs text-muted-foreground leading-snug">
              {Number(balance).toLocaleString()} stars available{earnText ? ` · ${earnText}` : ''}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Signed in but loyalty not yet active/available
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