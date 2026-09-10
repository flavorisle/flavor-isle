import React, { useState } from 'react';
import { Search, Flame, ChefHat, BaggageClaim, CheckCircle2, XCircle, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import MerchOrderStatusCard from '@/components/merch/MerchOrderStatusCard';

const STAGES = [
  { key: 'confirmed', label: 'Confirmed', Icon: CheckCircle2 },
  { key: 'cooking', label: 'Cooking', Icon: ChefHat },
  { key: 'ready', label: 'Ready', Icon: BaggageClaim },
  { key: 'done', label: 'Done', Icon: ShoppingBag },
];

const STATUS_PROFILE = {
  pending:    { stage: 0, headline: 'We got your order — holding for the go-ahead.', sub: "It's in our hands, fam. Just waiting on the green light to fire the grill.", color: '#1A3A5C' },
  confirmed:  { stage: 0, headline: "Locked in. We're about to fire the grill.", sub: "Order confirmed — the crew's pulling your stuff together now.", color: '#1A3A5C' },
  preparing:  { stage: 1, headline: "Your meal is on the grill — yeah, we dropped the sauce.", sub: "Patties hand-patted and placed on the grill, fries dropped, shakes spinning. You're almost there.", color: '#C0392B' },
  ready:      { stage: 2, headline: "Bag sealed. Fries hot. Vibes immaculate — pull up!", sub: "Your order is ready for pickup at Flavor Isle — Smiths Grove. Slide through whenever you're ready.", color: '#C0392B' },
  delivered:  { stage: 3, headline: "Handed off — hope you ate good, fam.", sub: "Your order's been delivered. You already know we came with the flavor.", color: '#1A3A5C' },
  completed:  { stage: 3, headline: "All wrapped. Thanks for pulling up!", sub: "Hope you ate good — you already know we dropped the sauce. 🔥", color: '#1A3A5C' },
  cancelled:  { stage: null, headline: "This order got cut.", sub: "Something came up and this one's no longer active. Hit the line at (270) 563-4618 if something's off.", color: '#8a0016' },
};

const stageIndex = (status) => STATUS_PROFILE[status]?.stage;

export default function OrderLookup() {
  const [orderNum, setOrderNum] = useState('');
  const [order, setOrder] = useState(null);
  const [merchOrder, setMerchOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = orderNum.trim();
    if (!q) {
      setError('Drop your order number in, fam — we need it to pull up your order.');
      return;
    }
    setError('');
    setLoading(true);
    setOrder(null);
    setMerchOrder(null);
    try {
      const results = await base44.entities.Order.filter({ order_number: q });
      if (results && results.length > 0) {
        setOrder(results[0]);
      } else {
        const merch = await base44.entities.MerchOrder.filter({ order_number: q });
        if (merch && merch.length > 0) {
          setMerchOrder(merch[0]);
        } else {
          setError(`No order found for "${q}". Double-check the number — every order's got one on your confirmation email.`);
        }
      }
    } catch (err) {
      setError("Couldn't pull up your order right now. Hit the line at (270) 563-4618 and we'll sort it.");
    } finally {
      setLoading(false);
    }
  };

  const profile = order ? (STATUS_PROFILE[order.status] || STATUS_PROFILE.pending) : null;
  const activeStage = order ? stageIndex(order.status) : null;
  const orderTypeLabel = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' }[order?.order_type] || '';
  const itemsCount = (order?.items || []).reduce((a, i) => a + (i.quantity || 1), 0);

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="card-diner p-5 sm:p-6 mb-6">
        <label className="block text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">
          Order Number
        </label>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={orderNum}
              onChange={(e) => setOrderNum(e.target.value)}
              placeholder="123456"
              className="w-full pl-10 pr-4 py-3.5 border border-border rounded-2xl bg-white font-body text-obsidian-roast focus:outline-none focus:border-midnight-cherry focus:ring-2 focus:ring-midnight-cherry/20 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-cherry chrome-hover px-6 py-3.5 text-sm font-heading flex items-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Checking</>
            ) : (
              <>Track <ArrowRight size={16} /></>
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3 font-body">
          Tip: your order number's on your confirmation email, right under "ORDER CONFIRMED". Works for Tasty Threads merch orders too.
        </p>
      </form>

      {merchOrder && <MerchOrderStatusCard order={merchOrder} />}

      {error && !order && (
        <div className="card-diner p-5 border-l-4" style={{ borderLeftColor: 'var(--midnight-cherry)' }}>
          <p className="font-body text-obsidian-roast">{error}</p>
        </div>
      )}

      {order && profile && (
        <div className="card-diner overflow-hidden animate-float-up">
          <div className="px-6 py-7 text-white" style={{ background: profile.color }}>
            <div className="flex items-center gap-3 mb-2">
              {order.status === 'ready' && <Flame size={22} />}
              {order.status === 'cancelled' && <XCircle size={22} />}
              {order.status !== 'ready' && order.status !== 'cancelled' && <ChefHat size={22} />}
              <span className="font-heading uppercase tracking-widest text-xs opacity-90">Order #{order.order_number}</span>
            </div>
            <h2 className="font-heading text-2xl sm:text-3xl leading-tight mb-2">{profile.headline}</h2>
            <p className="font-body text-white/85 text-sm sm:text-base">{profile.sub}</p>
          </div>

          {activeStage !== null && (
            <div className="px-6 py-7">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-6 left-0 right-0 h-1 bg-muted rounded-full" />
                <div
                  className="absolute top-6 left-0 h-1 bg-midnight-cherry rounded-full transition-all duration-500"
                  style={{ width: `${(activeStage / (STAGES.length - 1)) * 100}%` }}
                />
                {STAGES.map((s, i) => {
                  const done = i <= activeStage;
                  const Icon = s.Icon;
                  return (
                    <div key={s.key} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                          done ? 'bg-midnight-cherry text-white shadow-float' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon size={20} />
                      </div>
                      <span className={`text-[11px] sm:text-xs font-heading uppercase tracking-wider ${done ? 'text-obsidian-roast' : 'text-muted-foreground'}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="px-6 pb-6 -mt-2">
            <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
              <div>
                <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-1">Order Type</p>
                <p className="font-body text-obsidian-roast">{orderTypeLabel}</p>
              </div>
              <div>
                <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-1">Items</p>
                <p className="font-body text-obsidian-roast">{itemsCount} item{itemsCount !== 1 ? 's' : ''}</p>
              </div>
              {order.estimated_time && (
                <div>
                  <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-1">Est. Time</p>
                  <p className="font-body text-obsidian-roast">~{order.estimated_time} min</p>
                </div>
              )}
              <div>
                <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-1">Total</p>
                <p className="font-body text-obsidian-roast font-semibold">${(order.total || 0).toFixed(2)}</p>
              </div>
            </div>

            {(order.items || []).length > 0 && (
              <div className="bg-muted/60 rounded-2xl p-4 space-y-2">
                {(order.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between text-sm font-body">
                    <span className="text-obsidian-roast">{it.name}{(it.quantity || 1) > 1 ? ` ×${it.quantity}` : ''}</span>
                  </div>
                ))}
              </div>
            )}

            {order.status === 'ready' && (
              <a
                href="https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-cherry chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm mt-5"
              >
                Get Directions <ArrowRight size={16} />
              </a>
            )}
          </div>
        </div>
      )}

      {!order && !merchOrder && (
        <div className="text-center">
          <p className="text-muted-foreground font-body text-sm">
            No order number yet?{' '}
            <Link to="/menu" className="text-midnight-cherry font-heading underline hover:no-underline">
              Place an order
            </Link>{' '}
            and you'll get one in your inbox.
          </p>
        </div>
      )}
    </div>
  );
}