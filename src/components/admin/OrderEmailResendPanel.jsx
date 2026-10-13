import React, { useCallback, useEffect, useState } from 'react';
import { MailCheck, Search, Loader2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import OrderEmailResendActions from '@/components/admin/OrderEmailResendActions';

const ORDER_FIELDS = [
  'order_number', 'customer_name', 'customer_email', 'customer_phone', 'status',
  'total', 'created_date', 'confirmation_email_sent_at', 'cancellation_email_sent_at', 'cancel_reason',
];

const when = (value) =>
  new Date(value).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

// A customer on the phone says an email never arrived. Find their order, then
// resend whichever email they are missing — the confirmation, a status update,
// or the cancellation notice.
export default function OrderEmailResendPanel() {
  const [term, setTerm] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async (text) => {
    setLoading(true);
    setError('');
    try {
      const q = (text || '').trim();
      const digits = q.replace(/\D/g, '');
      const conditions = [];
      if (q) {
        conditions.push(
          { order_number: { $regex: q, $options: 'i' } },
          { customer_name: { $regex: q, $options: 'i' } },
          { customer_email: { $regex: q, $options: 'i' } },
        );
        if (digits.length >= 4) {
          conditions.push({ customer_phone: { $regex: digits } });
          // Orders carry the number normalized, so any shape the crew types
          // (270-555-1234, +1 270 555 1234, 2705551234) finds the same order.
          if (digits.length === 10) conditions.push({ normalized_phone: `+1${digits}` });
          if (digits.length === 11 && digits.startsWith('1')) conditions.push({ normalized_phone: `+${digits}` });
        }
      }
      const page = await base44.entities.Order.filter(
        q ? { $or: conditions } : {},
        { sort: '-created_date', limit: 8, fields: ORDER_FIELDS },
      );
      setOrders(page.items || []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not look up orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(''); }, [load]);

  const selected = orders.find((o) => o.id === selectedId) || null;

  const search = (e) => {
    e.preventDefault();
    setSelectedId(null);
    load(term);
  };

  return (
    <div className="card-diner p-6">
      <div className="flex items-center gap-2 mb-1">
        <MailCheck size={18} className="text-midnight-cherry" />
        <h3 className="font-heading text-lg text-obsidian-roast">Resend a Customer Email</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        A customer called about an email they did not get? Find their order by number, name, phone, or email, then resend the confirmation, a status update, or the cancellation notice.
      </p>

      <form onSubmit={search} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Order #, name, phone, or email — leave blank for the latest orders"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-white text-obsidian-roast text-sm focus:outline-none focus:border-midnight-cherry"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-mint min-h-11 px-5 text-sm disabled:opacity-50">
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Find order'}
        </button>
      </form>

      {error && (
        <div className="flex items-start gap-2 mt-4 text-sm rounded-xl px-4 py-3 bg-destructive/10 text-destructive">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && orders.length === 0 && (
        <p className="text-sm text-muted-foreground mt-4">No orders matched that. Try the order number, or the phone number they ordered with.</p>
      )}

      {orders.length > 0 && (
        <div className="mt-4 space-y-2">
          {orders.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelectedId(o.id === selectedId ? null : o.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                o.id === selectedId ? 'border-midnight-cherry bg-midnight-cherry/5' : 'border-border hover:border-midnight-cherry/40'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-base text-obsidian-roast truncate">#{o.order_number} · {o.customer_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{when(o.created_date)} · {o.customer_email || 'no email on this order'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-heading text-sm text-obsidian-roast">${Number(o.total || 0).toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">{o.status}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <OrderEmailResendActions order={selected} />}
    </div>
  );
}