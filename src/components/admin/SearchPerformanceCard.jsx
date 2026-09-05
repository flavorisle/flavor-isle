import React, { useState, useEffect, useCallback } from 'react';
import { Search, MousePointerClick, Eye, TrendingUp, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const RANGES = [7, 28, 90];

const pct = (v) => `${(v * 100).toFixed(1)}%`;

export default function SearchPerformanceCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [range, setRange] = useState(28);

  const load = useCallback(async (days) => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('getSearchConsoleStats', { days });
      if (res.data?.error) setError(res.data.error);
      setData(res.data);
    } catch (e) {
      setError('Could not load Search Console data.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(range); }, [range, load]);

  const totals = data?.totals;

  const stats = totals ? [
    { label: 'Clicks', value: totals.clicks.toLocaleString(), icon: MousePointerClick },
    { label: 'Impressions', value: totals.impressions.toLocaleString(), icon: Eye },
    { label: 'CTR', value: pct(totals.ctr), icon: TrendingUp },
    { label: 'Avg. Position', value: totals.avg_position.toFixed(1), icon: Search },
  ] : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="card-diner p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <Search size={20} className="text-midnight-cherry" />
            <h2 className="font-heading text-xl text-obsidian-roast">Site Search Performance</h2>
          </div>
          <div className="flex items-center gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-full text-xs font-heading transition-colors ${
                  range === r ? 'bg-midnight-cherry text-white' : 'bg-muted text-obsidian-roast hover:bg-gray-200'
                }`}
              >
                {r}d
              </button>
            ))}
            <button
              onClick={() => load(range)}
              aria-label="Refresh"
              className="p-2 rounded-full bg-muted text-obsidian-roast hover:bg-gray-200 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Google Search data for {data?.site_url || 'your site'}
          {data?.start_date ? ` · ${data.start_date} to ${data.end_date}` : ''}
        </p>

        {error && (
          <div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">{error}</div>
        )}

        {!error && loading && !data && (
          <p className="text-sm text-muted-foreground">Loading search data…</p>
        )}

        {!error && totals && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {stats.map((s) => (
                <div key={s.label} className="rounded-2xl bg-muted p-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    <s.icon size={13} />
                    <span className="text-xs uppercase tracking-widest font-heading">{s.label}</span>
                  </div>
                  <p className="font-heading text-2xl text-obsidian-roast">{s.value}</p>
                </div>
              ))}
            </div>

            {data.daily?.length > 0 && (
              <div className="h-56 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.daily}>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="impressions" stroke="var(--patina-mint)" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="clicks" stroke="var(--midnight-cherry)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast mb-2">Top Searches</h3>
                {data.top_queries?.length ? (
                  <div className="space-y-1.5">
                    {data.top_queries.map((q) => (
                      <div key={q.query} className="flex items-center justify-between gap-3 text-sm border-b border-border pb-1.5">
                        <span className="text-obsidian-roast truncate">{q.query}</span>
                        <span className="text-muted-foreground whitespace-nowrap text-xs">
                          {q.clicks} clicks · {q.impressions} views
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No search terms yet for this period.</p>
                )}
              </div>
              <div>
                <h3 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast mb-2">Top Pages</h3>
                {data.top_pages?.length ? (
                  <div className="space-y-1.5">
                    {data.top_pages.map((p) => (
                      <div key={p.page} className="flex items-center justify-between gap-3 text-sm border-b border-border pb-1.5">
                        <span className="text-obsidian-roast truncate">{p.page.replace(/^https?:\/\/[^/]+/, '') || '/'}</span>
                        <span className="text-muted-foreground whitespace-nowrap text-xs">
                          {p.clicks} clicks · {p.impressions} views
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No page data yet for this period.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}