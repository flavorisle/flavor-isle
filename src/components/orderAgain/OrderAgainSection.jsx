import React, { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/context/CartContext';
import OrderAgainCard from './OrderAgainCard';

// "Order Again" — the signed-in customer's own recent orders, one card per item,
// with the build they chose last time already priced from today's menu. Only
// their own orders are read (a customer can read their own Order records), so
// guests and first-time visitors never see the section.
const RECENT_ORDERS = 8;
const MAX_CARDS = 6;

export default function OrderAgainSection({ items = [] }) {
  const { user } = useAuth();
  const { orderingEnabled } = useCart();
  const [picks, setPicks] = useState([]);

  useEffect(() => {
    if (!user?.email || items.length === 0) { setPicks([]); return; }
    let cancelled = false;
    base44.entities.Order.filter({ customer_email: user.email }, '-created_date', RECENT_ORDERS)
      .then((orders) => { if (!cancelled) setPicks(recentItemPicks(orders || [], items)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.email, items]);

  if (picks.length === 0) return null;

  return (
    <section className="mt-8" data-testid="order-again">
      <div className="flex items-center gap-4 mb-5">
        <h2 className="font-heading text-2xl text-obsidian-roast flex items-center gap-2 whitespace-nowrap">
          <RotateCcw size={20} className="text-midnight-cherry" />
          Order Again
        </h2>
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">Your last orders</span>
      </div>
      <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-3 snap-x">
        {picks.map(({ item, stored }) => (
          <OrderAgainCard key={item.id} item={item} stored={stored} orderingEnabled={orderingEnabled} />
        ))}
      </div>
    </section>
  );
}

// The customer's most recent distinct items, newest first: each item shows once,
// carrying the build from the last time they ordered it, and only items still on
// the menu today are offered.
function recentItemPicks(orders, items) {
  const orderable = items.filter((i) => i.square_item_id && i.is_available !== false && !i.is_hidden);
  const bySquareId = new Map(orderable.map((i) => [i.square_item_id, i]));
  const seen = new Set();
  const picks = [];

  for (const order of orders.filter((o) => o.status !== 'cancelled')) {
    for (const stored of order.items || []) {
      const item = bySquareId.get(stored.square_item_id)
        || orderable.find((i) => i.name === stored.name);
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      picks.push({ item, stored });
      if (picks.length >= MAX_CARDS) return picks;
    }
  }
  return picks;
}