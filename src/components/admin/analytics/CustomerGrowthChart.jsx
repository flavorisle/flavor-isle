import React, { useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const monthKey = (d) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', year: '2-digit' }).format(d);

// Cumulative customer-profile growth over the last 12 months.
export default function CustomerGrowthChart({ profiles }) {
  const data = useMemo(() => {
    const months = 12;
    const now = new Date();
    const buckets = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: monthKey(d), label: monthKey(d), created: 0, cumulative: 0 });
    }

    // Count profiles created in each month bucket.
    for (const p of (profiles || [])) {
      if (!p.created_date) continue;
      const created = new Date(p.created_date);
      const key = monthKey(created);
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) bucket.created++;
    }

    // Running cumulative total (includes profiles created before the window).
    const beforeWindow = (profiles || []).filter(
      (p) => p.created_date && new Date(p.created_date) < new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)
    ).length;

    let running = beforeWindow;
    for (const b of buckets) {
      running += b.created;
      b.cumulative = running;
    }

    return buckets;
  }, [profiles]);

  const totalProfiles = (profiles || []).length;
  const newThisPeriod = data.reduce((s, d) => s + d.created, 0);

  return (
    <div className="card-diner p-6">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="font-heading text-lg text-obsidian-roast">Customer Growth</h3>
        <span className="text-xs text-muted-foreground">{totalProfiles} total · {newThisPeriod} new (12 mo)</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Cumulative customer profiles, last 12 months.</p>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="custGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--patina-mint)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--patina-mint)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', fontSize: 13 }}
              formatter={(value, name) => [value, name === 'cumulative' ? 'Total Profiles' : 'New']}
            />
            <Area type="monotone" dataKey="cumulative" stroke="var(--patina-mint)" strokeWidth={2} fill="url(#custGrowth)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}