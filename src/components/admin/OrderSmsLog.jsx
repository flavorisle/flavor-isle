import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw } from 'lucide-react';

export default function OrderSmsLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try { setLogs(await base44.entities.SmsDeliveryLog.list('-created_date', 50)); }
    catch { setError('Could not load order texts. Try Refresh.'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    return base44.entities.SmsDeliveryLog.subscribe(event => {
      setLogs(current => event.type === 'delete' ? current.filter(row => row.id !== event.id) :
        [event.data, ...current.filter(row => row.id !== event.id)].filter(Boolean).sort((a, b) => b.created_date.localeCompare(a.created_date)).slice(0, 50));
    });
  }, []);
  return <section className="mb-8" aria-label="Order status text delivery log">
    <div className="flex items-center justify-between gap-3 mb-3">
      <h2 className="font-heading text-xl text-foreground">Order Status Texts</h2>
      <button onClick={load} disabled={loading} className="min-h-11 px-3 inline-flex items-center gap-2 text-sm text-foreground"><RefreshCw size={16} /> Refresh</button>
    </div>
    <p className="text-sm text-muted-foreground mb-4">Latest 50 order texts. Queued means accepted by Twilio, not yet confirmed delivered.</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {loading ? <p role="status" className="text-muted-foreground">Loading order texts…</p> : !logs.length ? <p className="text-muted-foreground">No order status text attempts logged yet.</p> :
      <div className="space-y-3">{logs.map(log => <details key={log.id} className="rounded-xl border border-border bg-card p-4">
        <summary className="cursor-pointer min-h-11 text-foreground break-words">
          <span className="font-semibold">#{log.order_number} · {log.milestone}</span>
          <span className={`ml-2 capitalize font-semibold ${['failed', 'undelivered'].includes(log.status) ? 'text-destructive' : 'text-foreground'}`}>{log.status === 'pending' ? 'Sending' : log.status}</span>
          <span className="block text-sm text-muted-foreground">{log.customer_name || log.phone || 'No phone'} · {new Date(log.created_date).toLocaleString()}</span>
        </summary>
        <div className="pt-3 text-sm space-y-2 break-words"><p>{log.phone}</p><p className="whitespace-pre-wrap">{log.body}</p>
          {log.reason && <p><strong>Reason:</strong> {log.reason}</p>}{log.error_code && <p>Twilio error: {log.error_code}</p>}
          {log.message_sid && <p className="text-muted-foreground break-all">Message ID: {log.message_sid}</p>}
          {log.status_at && <p className="text-muted-foreground">Last update: {new Date(log.status_at).toLocaleString()}</p>}
        </div>
      </details>)}</div>}
  </section>;
}