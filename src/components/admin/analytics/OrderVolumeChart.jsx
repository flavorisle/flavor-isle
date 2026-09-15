import React, { useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const chicagoDateKey = (d) => {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(d);
};

const chicagoDayLabel = (d) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' }).format(d);

// 30-day daily order volume + revenue, store-local time.
export default function OrderVolumeChart({ orders }) {
  const data = useMemo(() => {
    const days = 30;
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const map = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = chicagoDateKey(d);
      map[key] = { date: key, label: chicagoDayLabel(d), orders: 0, revenue: 0 };
    }

    for (const o of (orders || [])) {
      if (o.status === 'cancelled' || o.payment_status !== 'paid') continue;
      const created = new Date(o.created_date);
      const key = chicagoDateKey(created);
      if (map[key]) {
        map[key].orders++;
        map[key].revenue += Number(o.total) || 0;
      }
    }

    return Object.values(map).reverse();
  }, [orders]);

  const totalOrders = data.reduce((s, d) => s + d.orders, 0);
  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const money = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="card-diner p-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="font-heading text-lg text-obsidian-roast">Daily Order Volume</h3>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{totalOrders} orders · {money(totalRevenue)} revenue</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Last 30 days (store local time).</p>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="orderVol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--midnight-cherry)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--midnight-cherry)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={4} />
            <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 13 }}
              formatter={(value, name) => [name === 'revenue' ? money(value) : value, name === 'revenue' ? 'Revenue' : 'Orders']}
            />
            <Area type="monotone" dataKey="orders" stroke="var(--midnight-cherry)" strokeWidth={2} fill="url(#orderVol)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}