import React, { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Clock, Receipt, XCircle } from 'lucide-react';
import { chicagoDayStartIso, formatChicagoTime } from '@/lib/chicagoTime';

// Today's orders for the Admin Dashboard: how many were placed and where each
// one stands, on the store's own calendar day (America/Chicago) rather than the
// viewer's. The counts come from one grouped server call and the list is a
// single page of the newest orders, so the dashboard never pulls the day into
// the browser to add it up.
const REFRESH_MS = 60 * 1000;

const DONE_STATUSES = ['completed', 'delivered'];
const LIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];

const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_CLASS = {
  completed: 'bg-green-100 text-green-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-700',
  ready: 'bg-blue-100 text-blue-800',
  preparing: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-yellow-100 text-yellow-800',
  pending: 'bg-muted text-muted-foreground',
};

const ORDER_TYPE_LABEL = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' };

export default function AdminTodayOrders() {
  const [counts, setCounts] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  const load = useCallback(async () => {
    const since = chicagoDayStartIso();
    const [grouped, page] = await Promise.all([
      base44.entities.Order.aggregate({ query: { created_date: { $gte: since } }, groupBy: 'status' }),
      base44.entities.Order.filter(
        { created_date: { $gte: since } },
        { sort: '-created_date', limit: 12, fields: ['order_number', 'customer_name', 'status', 'order_type', 'created_date'] },
      ),
    ]);

    const byStatus = {};
    (grouped.rows || []).forEach((row) => { byStatus[row.status] = row.count; });
    setCounts(byStatus);
    setOrders(page.items || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));

    // Reload as orders move, debounced so a burst of kitchen updates doesn't
    // fire one request per event.
    const unsubscribe = base44.entities.Order.subscribe((event) => {
      if (!['create', 'update'].includes(event.type)) return;
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => load().catch(() => {}), 1500);
    });
    const timer = setInterval(() => load().catch(() => {}), REFRESH_MS);

    return () => {
      unsubscribe();
      clearInterval(timer);
      clearTimeout(debounceRef.current);
    };
  }, [load]);

  const sumOf = (statuses) => statuses.reduce((n, status) => n + (counts?.[status] || 0), 0);
  const total = counts ? Object.values(counts).reduce((n, count) => n + count, 0) : 0;

  const tiles = [
    { label: 'Placed today', value: total, Icon: Receipt, tone: 'bg-patina-mint/10 text-patina-mint' },
    { label: 'Completed', value: sumOf(DONE_STATUSES), Icon: CheckCircle2, tone: 'bg-green-100 text-green-800' },
    { label: 'In progress', value: sumOf(LIVE_STATUSES), Icon: Clock, tone: 'bg-yellow-100 text-yellow-800' },
    { label: 'Cancelled', value: sumOf(['cancelled']), Icon: XCircle, tone: 'bg-red-100 text-red-700' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
      <div className="card-diner p-6">
        <div className="flex items-center gap-2 mb-1">
          <Receipt size={20} className="text-midnight-cherry" />
          <h2 className="font-heading text-xl text-obsidian-roast">Orders Today</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Everything placed today, and where each order stands right now.</p>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading today's orders…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {tiles.map(({ label, value, Icon, tone }) => (
                <div key={label} className="rounded-xl border border-border p-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${tone}`}>
                    <Icon size={16} />
                  </div>
                  <p className="font-heading text-2xl text-obsidian-roast leading-none">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{label}</p>
                </div>
              ))}
            </div>

            {orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders placed yet today.</p>
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <div key={order.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border last:border-0 pb-2 last:pb-0">
                    <span className="font-heading text-obsidian-roast min-w-[70px]">#{order.order_number}</span>
                    <span className="text-sm text-obsidian-roast flex-1 min-w-[140px] truncate">{order.customer_name || 'Guest'}</span>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {ORDER_TYPE_LABEL[order.order_type] || order.order_type || ''}
                    </span>
                    <span className={`text-xs font-heading uppercase tracking-wide rounded-full px-2 py-0.5 ${STATUS_CLASS[order.status] || 'bg-muted text-muted-foreground'}`}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                    <span className="text-xs text-muted-foreground min-w-[70px] text-right">
                      {formatChicagoTime(order.created_date, { hour: 'numeric', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}