import React, { useState, useEffect, useCallback } from 'react';
import { History, RefreshCw, Check, AlertTriangle, X, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import moment from 'moment';

const STATUS_META = {
  sent: { icon: Check, className: 'bg-patina-mint/15 text-patina-mint', label: 'Sent' },
  partial: { icon: AlertTriangle, className: 'bg-smashie-yellow/20 text-smashie-yellow', label: 'Partial' },
  failed: { icon: X, className: 'bg-midnight-cherry/15 text-midnight-cherry', label: 'Failed' },
};

export default function PushLogList() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await base44.entities.PushLog.list('-created_date', 25);
      setLogs(res || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const onSent = () => fetchLogs();
    window.addEventListener('flavorisle:push-sent', onSent);
    return () => window.removeEventListener('flavorisle:push-sent', onSent);
  }, [fetchLogs]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-8">
      <div className="card-diner p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-patina-mint/10 rounded-full flex items-center justify-center">
              <History size={18} className="text-patina-mint" />
            </div>
            <div>
              <h2 className="font-heading text-xl text-obsidian-roast">Push Notification Log</h2>
              <p className="text-sm text-muted-foreground">Recent broadcasts sent to subscribers.</p>
            </div>
          </div>
          <button onClick={fetchLogs} className="p-2 rounded-full hover:bg-muted transition-colors tap-44" aria-label="Refresh log">
            <RefreshCw size={16} className={`text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading log…</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No broadcasts yet.</p>
        ) : (
          <div className="space-y-3">
            {logs.map(log => {
              const meta = STATUS_META[log.status] || STATUS_META.sent;
              const Icon = meta.icon;
              return (
                <div key={log.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div className="min-w-0">
                      <p className="font-heading text-sm text-obsidian-roast truncate">{log.title || 'Flavor Isle'}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 break-words">{log.body}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-heading px-2.5 py-1 rounded-full flex-shrink-0 ${meta.className}`}>
                      <Icon size={12} /> {meta.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                    <span>{moment(log.created_date).format('MMM D, h:mm A')}</span>
                    <span>·</span>
                    <span>{log.sent_count}/{log.recipient_count} delivered</span>
                    {log.error_count > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-midnight-cherry">{log.error_count} failed</span>
                      </>
                    )}
                    {log.url && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">{log.url} <ExternalLink size={11} /></span>
                      </>
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