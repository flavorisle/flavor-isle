import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Gift, ArrowRight, Phone } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const RECENT_LIMIT = 5;

// Star Rewards on the order-start page: the member's live star balance plus the
// stars their most recent orders earned, so the value of ordering is visible
// before they ever reach the menu. Logged-out visitors get the join prompt.
export default function OrderLoyaltySection() {
  const { user, isLoadingAuth } = useAuth();
  const [status, setStatus] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user?.email) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [loyalty, page] = await Promise.all([
          base44.functions.invoke('squareLoyalty', { action: 'status' }).catch(() => null),
          base44.entities.Order
            .filter({ customer_email: user.email }, { sort: '-created_date', limit: RECENT_LIMIT })
            .catch(() => null),
        ]);
        if (cancelled) return;
        setStatus(loyalty?.data || null);
        setOrders(page?.items || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.email, isLoadingAuth]);

  // Visitors who aren't signed in — invite them into the program.
  if (!isLoadingAuth && !user) {
    return (
      <div className="mt-8 rounded-2xl border-2 border-smashie-yellow/40 bg-gradient-to-r from-smashie-yellow/10 to-patina-mint/5 p-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-smashie-yellow/25 flex items-center justify-center flex-shrink-0">
            <Star size={20} className="text-smashie-yellow" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-lg text-obsidian-roast leading-tight">Earn Star Rewards as you order</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Every order earns stars you can trade for free food — the same rewards you already earn in-store.
            </p>
          </div>
          <Link to="/rewards" className="hidden sm:inline-flex btn-cherry chrome-hover px-4 py-2.5 text-xs font-heading items-center gap-1.5 whitespace-nowrap">
            See Rewards <ArrowRight size={14} />
          </Link>
        </div>
        <Link to="/rewards" className="sm:hidden btn-cherry chrome-hover mt-4 w-full py-3 text-sm font-heading flex items-center justify-center gap-1.5">
          See Rewards <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-8 card-diner p-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-smashie-yellow/15 flex items-center justify-center flex-shrink-0">
          <Star size={16} className="text-smashie-yellow" />
        </div>
        <p className="text-sm text-muted-foreground">Loading your Star Rewards…</p>
      </div>
    );
  }

  const balance = Number(status?.balance || 0);
  const lifetime = Number(status?.lifetimePoints || 0);
  const earnedRecent = orders.reduce((sum, o) => sum + (Number(o.loyalty_points_earned) || 0), 0);
  const programName = status?.programName || 'Flavor Isle Star Rewards';

  // Signed in but Star Rewards needs their phone number to link the account.
  if (status?.needsPhone) {
    return (
      <div className="mt-8 card-diner p-5 flex items-center gap-3 border border-amber-200 bg-amber-50/60">
        <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Phone size={18} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-base text-obsidian-roast">Link your Star Rewards</h3>
          <p className="text-sm text-muted-foreground">Add your phone number and we'll show your stars right here.</p>
        </div>
        <Link to="/account" className="btn-mint chrome-hover px-4 py-2.5 text-xs font-heading whitespace-nowrap flex-shrink-0">
          Add Phone
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 card-diner p-5 sm:p-6 bg-gradient-to-br from-patina-mint to-[#14304a] text-white relative overflow-hidden">
      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/5" />
      <div className="relative">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
            <Star size={24} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-white/70 font-semibold">{programName}</p>
            <p className="font-heading text-4xl leading-none mt-1">{balance.toLocaleString()}</p>
            <p className="text-xs text-white/70 mt-1">
              stars available{lifetime > 0 ? ` · ${lifetime.toLocaleString()} earned all-time` : ''}
            </p>
          </div>
          <Link to="/rewards" className="hidden sm:flex items-center gap-2 bg-midnight-cherry hover:bg-red-800 transition-colors px-4 py-2.5 rounded-2xl font-heading text-xs whitespace-nowrap flex-shrink-0">
            <Gift size={14} /> Redeem <ArrowRight size={13} />
          </Link>
        </div>

        {orders.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/15">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <p className="text-[11px] uppercase tracking-widest text-white/60 font-semibold">From your recent orders</p>
              {earnedRecent > 0 && (
                <p className="font-heading text-sm text-smashie-yellow">+{earnedRecent.toLocaleString()} stars</p>
              )}
            </div>
            <ul className="space-y-1.5">
              {orders.map(o => (
                <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-white/75 truncate">
                    {o.order_number || 'Order'}
                    <span className="text-white/40"> · {new Date(o.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </span>
                  <span className="font-heading text-white whitespace-nowrap">
                    {Number(o.loyalty_points_earned) > 0 ? `+${Number(o.loyalty_points_earned)} ⭐` : '—'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {status?.earnText && (
          <p className="text-xs text-white/60 mt-3">{status.earnText}</p>
        )}

        <Link to="/rewards" className="sm:hidden mt-4 w-full bg-midnight-cherry hover:bg-red-800 transition-colors px-4 py-3 rounded-2xl font-heading text-xs flex items-center justify-center gap-2">
          <Gift size={14} /> Redeem Stars <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}