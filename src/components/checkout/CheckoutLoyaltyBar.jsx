import React, { useState, useEffect } from 'react';
import { Star, Gift, Phone, TrendingUp, Award } from 'lucide-react';
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

// Loyalty strip for checkout. When the customer types a phone number, it
// automatically looks up their live Star Rewards balance and tier — works for
// guests and signed-in members alike (rewards are keyed by phone).
export default function CheckoutLoyaltyBar({ subtotal, phone }) {
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

  // Phone entered + loyalty account found — live balance, tier, and progress.
  if (hasPhone && s.hasAccount) {
    return (
      <div className="card-diner p-4 bg-gradient-to-r from-patina-mint/8 to-midnight-cherry/5 border border-patina-mint/20">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-patina-mint/15 rounded-full flex items-center justify-center flex-shrink-0">
            <Award size={18} className="text-patina-mint" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-sm text-obsidian-roast">{balance.toLocaleString()} stars available</p>
            <p className="text-xs text-muted-foreground leading-snug">
              {current ? `Tier: ${current.name} — ${current.description}` : 'No reward tier unlocked yet'}
            </p>
          </div>
        </div>
        {next ? (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{Math.max(0, next.points - balance)} stars to {next.name}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-patina-mint rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : current ? (
          <p className="text-xs text-patina-mint font-heading">Highest tier reached — you're a legend! 🏆</p>
        ) : null}
        <p className="text-xs text-midnight-cherry font-heading mt-2">This order earns ~{estStars} stars ⭐</p>
      </div>
    );
  }

  // Phone entered but no rewards account found for that number.
  if (hasPhone) {
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
  if (isGuest) {
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

  // Signed in with active loyalty account (no phone typed, using saved profile).
  if (s.hasAccount) {
    return (
      <div className="card-diner p-4 bg-gradient-to-r from-patina-mint/8 to-midnight-cherry/5 border border-patina-mint/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-patina-mint/15 rounded-full flex items-center justify-center flex-shrink-0">
            <TrendingUp size={18} className="text-patina-mint" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-heading text-sm text-obsidian-roast">{balance.toLocaleString()} stars · earns ~{estStars} ⭐</p>
            <p className="text-xs text-muted-foreground leading-snug">
              {current ? `Tier: ${current.name}` : 'No reward tier unlocked yet'}
              {s.earnText ? ` · ${s.earnText}` : ''}
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