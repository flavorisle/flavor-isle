import React, { useState, useMemo } from 'react';
import { Users, Search, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Badge for a subscriber's consent category (split transactional vs marketing).
function ConsentBadge({ sub }) {
  const stopped = sub.status === 'unsubscribed';
  if (stopped) {
    return <span className="text-[11px] font-heading uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-100 text-red-700">Stopped</span>;
  }
  const tx = !!sub.transactional_consent;
  const mk = !!sub.marketing_consent && !!sub.proven_marketing_consent;
  if (tx && mk) return <span className="text-[11px] font-heading uppercase tracking-wider px-2.5 py-1 rounded-full bg-patina-mint/15 text-patina-mint">Both</span>;
  if (mk) return <span className="text-[11px] font-heading uppercase tracking-wider px-2.5 py-1 rounded-full bg-smashie-yellow/20 text-obsidian-roast">Offers</span>;
  if (tx) return <span className="text-[11px] font-heading uppercase tracking-wider px-2.5 py-1 rounded-full bg-midnight-cherry/10 text-midnight-cherry">Orders</span>;
  return <span className="text-[11px] font-heading uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted text-muted-foreground">None</span>;
}

export default function SmsSubscribersList() {
  const [subs, setSubs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await base44.entities.SMSSubscriber.list('-created_date', 500);
      setSubs(list);
    } catch (err) {
      setError(err.message || 'Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!subs) return [];
    const q = query.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter((s) =>
      `${s.name || ''} ${s.phone || ''} ${s.email || ''}`.toLowerCase().includes(q)
    );
  }, [subs, query]);

  const activeCount = useMemo(
    () => (subs || []).filter((s) => s.status === 'active' && (s.transactional_consent || s.marketing_consent)).length,
    [subs]
  );
  const marketingCount = useMemo(
    () => (subs || []).filter((s) => s.status === 'active' && s.marketing_consent && s.proven_marketing_consent).length,
    [subs]
  );

  return (
    <div className="space-y-5">
      {/* Summary + search */}
      <div className="card-diner p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-midnight-cherry/10 rounded-full flex items-center justify-center">
              <Users size={18} className="text-midnight-cherry" />
            </div>
            <div>
              <h3 className="font-heading text-lg text-obsidian-roast">SMS Subscribers</h3>
              <p className="text-xs text-muted-foreground">
                {subs == null ? 'Loading…' : `${activeCount} with consent · ${marketingCount} proven marketing · ${subs.length} total`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name or number"
                className="w-full rounded-full border border-border bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-midnight-cherry"
              />
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="p-2.5 rounded-full bg-muted hover:bg-midnight-cherry hover:text-white transition-colors tap-44"
              aria-label="Refresh subscribers"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="card-diner overflow-hidden">
        {error && (
          <div className="p-4 text-sm text-destructive bg-destructive/10">{error}</div>
        )}
        {!error && loading && subs == null && (
          <div className="p-10 flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading subscribers…
          </div>
        )}
        {!error && !loading && filtered.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {subs && subs.length === 0
              ? 'No one has subscribed to texts yet.'
              : 'No subscribers match your search.'}
          </div>
        )}
        {filtered.length > 0 && (
          <ul className="divide-y divide-border">
            {filtered.map((s) => {
              const isActive = s.status === 'active' && (s.transactional_consent || s.marketing_consent);
              return (
                <li key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isActive ? 'bg-patina-mint/15' : 'bg-muted'}`}>
                    {isActive
                      ? <CheckCircle2 size={16} className="text-patina-mint" />
                      : <XCircle size={16} className="text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm text-obsidian-roast truncate">
                      {s.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {s.phone}{s.email ? ` · ${s.email}` : ''}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <ConsentBadge sub={s} />
                    {s.consent_source_page && (
                      <p className="text-[10px] text-muted-foreground">{s.consent_source_page}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}