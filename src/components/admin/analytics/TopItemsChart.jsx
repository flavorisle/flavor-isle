import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

// Aggregates item names across all paid, non-cancelled orders and shows the
// top 10 by quantity sold.
export default function TopItemsChart({ orders }) {
  const data = useMemo(() => {
    const counts = {};
    for (const o of (orders || [])) {
      if (o.status === 'cancelled' || o.payment_status !== 'paid') continue;
      for (const item of (o.items || [])) {
        const name = item.name || 'Unknown';
        const qty = Number(item.quantity) || 1;
        counts[name] = (counts[name] || 0) + qty;
      }
    }
    return Object.entries(counts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)
      .reverse(); // reverse so the #1 item renders at the top of the horizontal chart
  }, [orders]);

  const totalQty = data.reduce((s, d) => s + d.qty, 0);

  return (
    <div className="card-diner p-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="font-heading text-lg text-obsidian-roast">Top Items Sold</h3>
        <span className="text-xs text-muted-foreground">{totalQty} sold (top 10)</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">By quantity, last 30 days.</p>
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">No item data yet.</p>
      ) : (
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 13 }}
                formatter={(value) => [value, 'Qty Sold']}
              />
              <Bar dataKey="qty" fill="var(--patina-mint)" radius={[0, 6, 6, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}