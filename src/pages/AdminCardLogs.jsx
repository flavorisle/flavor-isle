import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import AdminNav from '@/components/admin/AdminNav';
import CardPaymentLogRow from '@/components/admin/CardPaymentLogRow';
import { RefreshCw, Search } from 'lucide-react';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'declined', label: 'Declined' },
  { key: 'unsettled', label: 'Approved, not matched' },
  { key: 'error', label: 'Errors' },
];

// Escapes pattern characters so an order number or a customer name typed into the search
// box is matched as plain text, never read as a regular expression.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default function AdminCardLogs() {
  const [logs, setLogs] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const query = {};
      if (filter !== 'all') query.outcome = filter;
      if (debouncedSearch) {
        const rx = { $regex: escapeRegex(debouncedSearch), $options: 'i' };
        query.$or = [
          { order_number: rx },
          { customer_name: rx },
          { customer_email: rx },
          { response_message: rx },
        ];
      }
      const page = await base44.entities.CardPaymentLog.filter(query, { sort: '-created_date', limit: 100 });
      setLogs(page?.items || []);
    } catch (err) {
      console.error('Failed to load card decline logs:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, debouncedSearch]);

  // One grouped call gives every filter's total without loading a record.
  const loadCounts = useCallback(async () => {
    try {
      const grouped = await base44.entities.CardPaymentLog.aggregate({ groupBy: 'outcome' });
      const next = {};
      let total = 0;
      (grouped?.rows || []).forEach((row) => {
        next[row.outcome] = row.count;
        total += row.count;
      });
      next.all = total;
      setCounts(next);
    } catch (err) {
      console.error('Failed to count card decline logs:', err);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => { loadCounts(); }, [loadCounts]);

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="font-heading text-3xl text-obsidian-roast">Card Declines</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every card that did not go through, with the exact reason the card system reported. Nothing here means no card has been refused.
            </p>
          </div>
          <button
            onClick={() => { loadLogs(); loadCounts(); }}
            disabled={loading}
            className="btn-mint px-4 py-2 text-xs flex items-center gap-2 flex-shrink-0"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-full text-xs font-heading transition-all ${
                  filter === key ? 'bg-midnight-cherry text-white' : 'bg-white text-muted-foreground hover:bg-midnight-cherry/10'
                }`}
              >
                {label} {counts[key] > 0 && <span className="opacity-60">({counts[key]})</span>}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, customer, or message…"
              className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <RefreshCw size={24} className="animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-heading text-lg">No card declines recorded</p>
            <p className="text-sm mt-1">A card that is refused at checkout will appear here with its reason.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => <CardPaymentLogRow key={log.id} log={log} />)}
          </div>
        )}
      </div>
    </div>
  );
}