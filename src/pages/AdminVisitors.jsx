import React, { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AdminNav from '@/components/admin/AdminNav';
import VisitorActivityRow from '@/components/admin/VisitorActivityRow';

const VIEW_LIMIT = 500;

// Owner and crew (issue #161): their own browsing is never counted as a visitor.
const STAFF_EMAILS = ['wesleyrbooker1@gmail.com', 'wesley@flavor-isle.com', 'ashleybooker29@gmail.com'];
const STAFF_DOMAINS = ['@flavorisle.com', '@flavor-isle.com'];

const isStaffEmail = (email, adminEmails) => {
  const e = String(email || '').toLowerCase().trim();
  if (!e) return false;
  return STAFF_EMAILS.includes(e) || STAFF_DOMAINS.some((d) => e.endsWith(d)) || adminEmails.includes(e);
};

// Every row falls into exactly one bucket. Rows written before the classifier
// existed carry no flag, so they are legacy — never human, never bot.
const viewKind = (view, adminEmails) => {
  if (view.classified !== true) return 'legacy';
  if (view.is_bot === true) return 'bot';
  return isStaffEmail(view.user_email, adminEmails) ? 'staff' : 'human';
};

// Groups page views into visitors: a signed-in visitor is one visitor across every
// device, a guest is grouped by visit id (falling back to address), a bot by the
// rule it matched.
function groupViews(views, adminEmails) {
  const grouped = new Map();

  views.forEach((view) => {
    const kind = viewKind(view, adminEmails);
    let key;
    if (kind === 'bot') key = `bot:${view.ip || 'unknown'}|${view.bot_reason || ''}`;
    else if (view.user_email) key = `${kind}:user:${view.user_email.toLowerCase()}`;
    else if (kind === 'human' && view.session_id) key = `human:sid:${view.session_id}`;
    else key = `${kind}:ip:${view.ip || 'unknown'}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        kind,
        isAccount: Boolean(view.user_email),
        label: kind === 'bot'
          ? (view.visitor_ua || view.user_agent || 'Automated request')
          : (view.user_name || view.user_email || view.ip || 'Unknown visitor'),
        botReason: kind === 'bot' ? (view.bot_reason || '') : '',
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

const TABS = [
  { key: 'humans', label: 'Humans' },
  { key: 'bots', label: 'Bots' },
  { key: 'everything', label: 'Everything' },
];

export default function AdminVisitors() {
  const [views, setViews] = useState([]);
  const [adminEmails, setAdminEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('humans');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [page, users] = await Promise.all([
        base44.entities.VisitorPageView.filter({}, { sort: '-created_date', limit: VIEW_LIMIT }),
        base44.entities.User.list().catch(() => []),
      ]);
      setViews(page?.items || []);
      setAdminEmails((users || [])
        .filter((u) => u?.role === 'admin' && u?.email)
        .map((u) => u.email.toLowerCase().trim()));
    } catch (err) {
      console.error('Failed to load visitor page views:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Counted only from classified rows: a human is classified and not a bot.
  const humanViews = views.filter((v) => v.classified === true && v.is_bot !== true);
  const botViews = views.filter((v) => v.classified === true && v.is_bot === true);
  const grouped = groupViews(views, adminEmails);
  const humanVisitors = groupViews(humanViews, adminEmails).filter((v) => v.kind === 'human');
  const signedInCount = new Set(
    humanViews.filter((v) => v.user_email).map((v) => v.user_email.toLowerCase())
  ).size;

  const tabRows = tab === 'humans'
    ? humanVisitors
    : tab === 'bots'
      ? grouped.filter((v) => v.kind === 'bot')
      : grouped;

  const term = search.trim().toLowerCase();
  const shown = term
    ? tabRows.filter((visitor) =>
        [visitor.label, visitor.ip, visitor.lastPath, visitor.botReason, ...visitor.views.map((v) => v.path)]
          .join(' ')
          .toLowerCase()
          .includes(term)
      )
    : tabRows;

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="font-heading text-3xl text-obsidian-roast">Visitors</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real people by default. Crawlers, link previews and prerender probes are recorded separately, so the count you read is people.
              Showing the most recent {VIEW_LIMIT} page views.
            </p>
          </div>
          <button onClick={load} disabled={loading} className="btn-mint px-4 py-2 text-xs flex items-center gap-2 flex-shrink-0">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="flex gap-2 flex-wrap mb-3 text-xs font-heading">
          <span className="px-3 py-1.5 rounded-full bg-white border border-border text-obsidian-roast">
            {humanVisitors.length} human visitors
          </span>
          <span className="px-3 py-1.5 rounded-full bg-white border border-border text-obsidian-roast">
            {signedInCount} signed in
          </span>
          <span className="px-3 py-1.5 rounded-full bg-white border border-border text-obsidian-roast">
            {humanViews.length} human page views
          </span>
          <span className="px-3 py-1.5 rounded-full bg-white border border-border text-muted-foreground">
            {botViews.length} bot requests filtered
          </span>
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-xs font-heading transition-colors ${
                tab === t.key
                  ? 'bg-midnight-cherry text-white'
                  : 'bg-white border border-border text-obsidian-roast hover:bg-midnight-cherry/5'
              }`}
            >
              {t.label}
            </button>
          ))}
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
            <p className="font-heading text-lg">
              {tab === 'bots' ? 'No bots recorded yet' : tab === 'humans' ? 'No human visitors recorded yet' : 'Nothing recorded yet'}
            </p>
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