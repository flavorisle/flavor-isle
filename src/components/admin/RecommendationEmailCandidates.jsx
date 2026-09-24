import React, { useEffect, useState } from 'react';
import { Clock, Loader2, RefreshCw, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import moment from 'moment';

export default function RecommendationEmailCandidates() {
  const [orders, setOrders] = useState([]);
  const [sent, setSent] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      // Pull recent online orders; the scanner targets ~30min–2hr old paid orders
      const recent = await base44.entities.Order.list('-created_date', 30);
      const now = Date.now();
      const candidates = (recent || [])
        .filter((o) => o.order_source !== 'in_store')
        .filter((o) => o.status !== 'cancelled' && o.payment_status !== 'failed' && o.payment_status !== 'refunded')
        .filter((o) => {
          const ageMin = (now - new Date(o.created_date).getTime()) / 60000;
          return ageMin >= 25 && ageMin <= 180;
        });
      setOrders(candidates);
    } catch (err) {
      console.error('Failed to load candidate orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sendNow = async (orderId) => {
    setSent((s) => ({ ...s, [orderId]: 'sending' }));
    try {
      const res = await base44.functions.invoke('sendOrderRecommendationEmail', { order_id: orderId });
      setSent((s) => ({ ...s, [orderId]: res?.skipped ? `skipped: ${res.reason}` : 'sent' }));
    } catch (err) {
      setSent((s) => ({ ...s, [orderId]: `error: ${err.message}` }));
    }
  };

  return (
    <div className="card-diner p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-midnight-cherry" />
          <h3 className="font-heading text-lg text-obsidian-roast">Pending Candidates</h3>
        </div>
        <button onClick={load} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Refresh">
          <RefreshCw size={16} className={loading ? 'animate-spin text-muted-foreground' : 'text-muted-foreground'} />
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Online orders 25–180 min old that qualify for a recommendation email. The scanner picks these up automatically every 10 minutes — use Send Now to trigger one immediately.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No candidate orders in the 25–180 min window right now.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {orders.map((o) => {
            const state = sent[o.id];
            return (
              <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-body text-obsidian-roast truncate">
                    {o.customer_name || 'Guest'} · {o.customer_email || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.order_number || o.id.slice(-6)} · placed {moment(o.created_date).fromNow()}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-3">
                  {state === 'sending' ? (
                    <Loader2 size={16} className="animate-spin text-muted-foreground" />
                  ) : state ? (
                    <span className={`text-xs font-heading ${state === 'sent' ? 'text-patina-mint' : 'text-destructive'}`}>
                      {state === 'sent' ? '✓ Sent' : state}
                    </span>
                  ) : (
                    <button
                      onClick={() => sendNow(o.id)}
                      className="inline-flex items-center gap-1 text-xs font-heading text-midnight-cherry hover:bg-midnight-cherry/10 px-3 py-1.5 rounded-full transition-colors"
                    >
                      <Send size={12} /> Send Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}