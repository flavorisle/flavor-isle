import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, ShoppingBag, DollarSign, Calendar, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const chicagoDateKey = (d) => {
  // Convert to America/Chicago regardless of the viewer's timezone so the
  // store's day boundaries line up with the POS.
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(d);
};

const chicagoDayLabel = (d) => {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', weekday: 'short',
  }).format(d);
};

const startOfWeek = (now) => {
  const d = new Date(now);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // back to Monday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export default function StoreMetrics() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Pull paid orders from the last 7 days (store-local time).
        const since = startOfWeek(new Date());
        const list = await base44.entities.Order.filter(
          { payment_status: 'paid', created_date: { $gte: since.toISOString() } },
          '-created_date',
          500
        );
        if (!cancelled) setOrders(list || []);
      } catch (err) {
        if (!cancelled) { setError(err.message || 'Could not load metrics'); setOrders([]); }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = useMemo(() => {
    if (!orders) return null;

    const todayKey = chicagoDateKey(new Date());
    const weekStart = startOfWeek(new Date());

    let todayCount = 0, todayRevenue = 0;
    let weekCount = 0, weekRevenue = 0;
    let weekTip = 0;
    const byType = { pickup: 0, delivery: 0, dine_in: 0 };
    const bySource = { online: 0, in_store: 0, phone: 0 };
    const dailyMap = {};

    for (const o of orders) {
      const created = new Date(o.created_date);
      const dKey = chicagoDateKey(created);
      const total = Number(o.total) || 0;
      const tip = Number(o.tip) || 0;

      // Skip cancelled / refunded for revenue, but keep in volume counts.
      const countsForRevenue = o.status !== 'cancelled' && o.payment_status === 'paid';

      weekCount++;
      if (countsForRevenue) {
        weekRevenue += total;
        weekTip += tip;
        byType[o.order_type] = (byType[o.order_type] || 0) + total;
        const src = o.order_source === 'in_store' ? 'in_store'
          : (o.order_number?.startsWith('PH') ? 'phone' : 'online');
        bySource[src] = (bySource[src] || 0) + total;
      }

      if (dKey === todayKey) {
        todayCount++;
        if (countsForRevenue) todayRevenue += total;
      }

      // Daily bucket for the 7-day chart.
      const dayStart = new Date(dKey + 'T00:00:00');
      if (dayStart >= weekStart) {
        if (!dailyMap[dKey]) dailyMap[dKey] = { date: dKey, label: chicagoDayLabel(dayStart), orders: 0, revenue: 0 };
        dailyMap[dKey].orders++;
        if (countsForRevenue) dailyMap[dKey].revenue += total;
      }
    }

    // Fill any missing days in the week so the chart isn't sparse.
    const daily = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dKey = chicagoDateKey(d);
      daily.push(dailyMap[dKey] || { date: dKey, label: chicagoDayLabel(d), orders: 0, revenue: 0 });
    }

    return {
      todayCount, todayRevenue,
      weekCount, weekRevenue, weekTip,
      byType, bySource, daily,
      avgOrder: weekCount > 0 ? weekRevenue / weekCount : 0,
    };
  }, [orders]);

  if (!orders) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="font-heading text-2xl text-obsidian-roast mb-4">Store Metrics</h2>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 size={18} className="animate-spin" /> Loading sales data…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h2 className="font-heading text-2xl text-obsidian-roast mb-4">Store Metrics</h2>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const money = (n) => `$${(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const cards = [
    { label: "Today's Orders", value: stats.todayCount, sub: money(stats.todayRevenue) + ' revenue', Icon: ShoppingBag, iconBg: 'bg-midnight-cherry' },
    { label: 'This Week', value: stats.weekCount, sub: money(stats.weekRevenue) + ' revenue', Icon: Calendar, iconBg: 'bg-patina-mint' },
    { label: 'Avg Order', value: money(stats.avgOrder), sub: 'across this week', Icon: TrendingUp, iconBg: 'bg-obsidian-roast' },
    { label: 'Tips This Week', value: money(stats.weekTip), sub: '100% to the crew', Icon: DollarSign, iconBg: 'bg-midnight-cherry' },
  ];

  const typeLabels = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' };
  const sourceLabels = { online: 'Online', in_store: 'In-Person', phone: 'Phone' };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp size={22} className="text-midnight-cherry" />
        <h2 className="font-heading text-2xl text-obsidian-roast">Store Metrics</h2>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="card-diner p-5">
            <div className={`w-10 h-10 rounded-2xl ${c.iconBg} flex items-center justify-center mb-3`}>
              <c.Icon size={18} className="text-white" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{c.label}</p>
            <p className="font-heading text-2xl text-obsidian-roast mt-1">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Daily volume chart */}
      <div className="card-diner p-6 mb-6">
        <h3 className="font-heading text-lg text-obsidian-roast mb-1">Daily Order Volume</h3>
        <p className="text-xs text-muted-foreground mb-4">Orders per day this week (store local time).</p>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={stats.daily} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 13 }}
                formatter={(value, name) => [name === 'revenue' ? money(value) : value, name === 'revenue' ? 'Revenue' : 'Orders']}
              />
              <Bar dataKey="orders" fill="var(--midnight-cherry)" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="card-diner p-6">
          <h3 className="font-heading text-lg text-obsidian-roast mb-3">Revenue by Order Type</h3>
          <div className="space-y-2">
            {Object.entries(typeLabels).map(([key, label]) => {
              const val = stats.byType[key] || 0;
              const pct = stats.weekRevenue > 0 ? (val / stats.weekRevenue) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-heading text-obsidian-roast">{money(val)} <span className="text-muted-foreground font-body">({pct.toFixed(0)}%)</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-midnight-cherry rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-diner p-6">
          <h3 className="font-heading text-lg text-obsidian-roast mb-3">Revenue by Source</h3>
          <div className="space-y-2">
            {Object.entries(sourceLabels).map(([key, label]) => {
              const val = stats.bySource[key] || 0;
              const pct = stats.weekRevenue > 0 ? (val / stats.weekRevenue) * 100 : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-heading text-obsidian-roast">{money(val)} <span className="text-muted-foreground font-body">({pct.toFixed(0)}%)</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-patina-mint rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-4">
        Based on paid orders placed since Monday. Refunded and cancelled orders are excluded from revenue. Times are in store local time (America/Chicago).
      </p>
    </div>
  );
}