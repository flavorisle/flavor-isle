import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AdminNav from '@/components/admin/AdminNav';
import VisitorActivityRow from '@/components/admin/VisitorActivityRow';

const VIEW_LIMIT = 500;

// Groups page views into visitors: a signed-in visitor is one visitor across every
// device, a guest is grouped by address.
function groupVisitors(views) {
  const grouped = new Map();

  views.forEach((view) => {
    const key = view.user_email
      ? `user:${view.user_email.toLowerCase()}`
      : `ip:${view.ip || 'unknown'}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        isAccount: Boolean(view.user_email),
        label: view.user_name || view.user_email || view.ip || 'Unknown visitor',
        ip: view.ip || 'unknown',
        views: [],
      });
    }
    const visitor = grouped.get(key);
    if (view.ip) visitor.ip = view.ip;
    visitor.views.push(view);
  });

  return [...grouped.values()].map((visitor) => ({
    ...visitor,
    lastPath: visitor.views[0]?.path || '/',
    lastAt: visitor.views[0]?.created_date,
    trail: [...visitor.views].reverse(),
  }));
}

export default function AdminVisitors() {
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await base44.entities.VisitorPageView.filter({}, { sort: '-created_date', limit: VIEW_LIMIT });
      setViews(page?.items || []);
    } catch (err) {
      console.error('Failed to load visitor page views:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const visitors = groupVisitors(views);
  const term = search.trim().toLowerCase();
  const shown = term
    ? visitors.filter((visitor) =>
        [visitor.label, visitor.ip, visitor.lastPath, ...visitor.views.map((v) => v.path)]
          .join(' ')
          .toLowerCase()
          .includes(term)
      )
    : visitors;

  const accountCount = visitors.filter((v) => v.isAccount).length;

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-3xl text-obsidian-roast">Visitors</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every visitor's address, the account they are signed in as, the page they are on now, and every page they opened.
              Showing the most recent {VIEW_LIMIT} page views.
            </p>
          </div>
          <button onClick={load} disabled={loading} className="btn-mint px-4 py-2 text-xs flex items-center gap-2 flex-shrink-0">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="flex gap-2 flex-wrap mb-4 text-xs font-heading">
          <span className="px-3 py-1.5 rounded-full bg-white border border-border text-obsidian-roast">
            {visitors.length} visitors
          </span>
          <span className="px-3 py-1.5 rounded-full bg-white border border-border text-obsidian-roast">
            {accountCount} signed in
          </span>
          <span className="px-3 py-1.5 rounded-full bg-white border border-border text-obsidian-roast">
            {views.length} page views
          </span>
        </div>

        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search an IP, an email, or a page…"
            className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
          />
        </div>

        {loading ? (
          <div className="text-center py-16">
            <RefreshCw size={24} className="animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : shown.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-heading text-lg">No visitors recorded yet</p>
            <p className="text-sm mt-1">Page views start appearing here as soon as someone opens the site.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {shown.map((visitor) => (
              <VisitorActivityRow key={visitor.key} visitor={visitor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}