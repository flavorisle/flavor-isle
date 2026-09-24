import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import AdminNav from '@/components/admin/AdminNav';
import { RefreshCw, AlertTriangle, CheckCircle, SkipForward, XCircle, Search } from 'lucide-react';

const STATUS_STYLES = {
  success: { badge: 'bg-green-100 text-green-700', Icon: CheckCircle, label: 'Success' },
  failed: { badge: 'bg-red-100 text-red-700', Icon: XCircle, label: 'Failed' },
  skipped: { badge: 'bg-yellow-100 text-yellow-700', Icon: SkipForward, label: 'Skipped' },
};

export default function AdminSquareLogs() {
  const [logs, setLogs] = useState([]);
  const [stuckOrders, setStuckOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [retrying, setRetrying] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [logResults, orders] = await Promise.all([
        base44.entities.SquareSyncLog.list('-created_date', 100),
        base44.entities.Order.filter({ order_source: 'online', payment_status: 'paid' }, '-created_date', 50),
      ]);
      setLogs(logResults || []);
      setStuckOrders((orders || []).filter(o => !o.square_order_id));
    } catch (err) {
      console.error('Failed to load Square logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const retryOrder = async (orderNumber) => {
    setRetrying(orderNumber);
    try {
      await base44.functions.invoke('confirmOnlinePayment', { orderNumber: String(orderNumber) });
      await loadData();
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setRetrying(null);
    }
  };

  const filtered = logs.filter(l => {
    if (filter !== 'all' && l.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.order_number || '').toLowerCase().includes(q) ||
             (l.customer_name || '').toLowerCase().includes(q) ||
             (l.customer_email || '').toLowerCase().includes(q) ||
             (l.error_message || '').toLowerCase().includes(q);
    }
    return true;
  });

  const counts = {
    all: logs.length,
    failed: logs.filter(l => l.status === 'failed').length,
    success: logs.filter(l => l.status === 'success').length,
    skipped: logs.filter(l => l.status === 'skipped').length,
  };

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-3xl text-obsidian-roast">Square Sync Logs</h1>
            <p className="text-sm text-muted-foreground mt-1">Every attempt to push an order to Square POS — success, failure, and skip.</p>
          </div>
          <button onClick={loadData} disabled={loading} className="btn-mint px-4 py-2 text-xs flex items-center gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Stuck orders — paid online orders with no Square order id */}
        {stuckOrders.length > 0 && (
          <div className="card-diner p-5 mb-6 border-2 border-red-200">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={18} className="text-red-600" />
              <h2 className="font-heading text-lg text-obsidian-roast">Stuck Orders ({stuckOrders.length})</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Paid online orders that never reached Square POS. These need a retry.</p>
            <div className="space-y-2">
              {stuckOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between bg-red-50 rounded-xl p-3">
                  <div className="min-w-0">
                    <p className="font-heading text-sm text-obsidian-roast">#{o.order_number} · {o.customer_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{o.customer_email} · ${o.total?.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => retryOrder(o.order_number)}
                    disabled={retrying === o.order_number}
                    className="btn-cherry px-4 py-2 text-xs flex items-center gap-2 flex-shrink-0 ml-3"
                  >
                    {retrying === o.order_number ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Retry
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters + search */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex gap-2 flex-wrap">
            {['all', 'failed', 'success', 'skipped'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full text-xs font-heading capitalize transition-all ${
                  filter === f ? 'bg-midnight-cherry text-white' : 'bg-white text-muted-foreground hover:bg-midnight-cherry/10'
                }`}
              >
                {f} {counts[f] > 0 && <span className="opacity-60">({counts[f]})</span>}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search order #, customer, error…"
              className="w-full pl-9 pr-4 py-2 bg-white border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
          </div>
        </div>

        {/* Log entries */}
        {loading ? (
          <div className="text-center py-16">
            <RefreshCw size={24} className="animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-heading text-lg">No sync attempts found</p>
            <p className="text-sm mt-1">New order pushes to Square will show up here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(log => {
              const style = STATUS_STYLES[log.status] || STATUS_STYLES.failed;
              const Icon = style.Icon;
              return (
                <div key={log.id} className="card-diner p-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${style.badge}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading text-sm text-obsidian-roast">#{log.order_number}</span>
                        <span className="text-xs text-muted-foreground">{log.customer_name}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">${log.total?.toFixed(2)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${style.badge} font-heading`}>{style.label}</span>
                      </div>
                      {log.square_order_id && (
                        <p className="text-xs text-patina-mint mt-1 font-mono break-all">Square: {log.square_order_id}</p>
                      )}
                      {log.error_message && (
                        <p className="text-xs text-red-600 mt-1 break-words">{log.error_message}</p>
                      )}
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {new Date(log.created_date).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                    {log.status === 'failed' && log.order_number && (
                      <button
                        onClick={() => retryOrder(log.order_number)}
                        disabled={retrying === log.order_number}
                        className="btn-mint px-3 py-1.5 text-xs flex items-center gap-1.5 flex-shrink-0"
                      >
                        {retrying === log.order_number ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}