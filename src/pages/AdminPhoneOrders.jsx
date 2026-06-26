import React, { useState, useEffect } from 'react';
import { Phone, Clock, CheckCircle, X, ChefHat, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  preparing: 'bg-orange-100 text-orange-700 border-orange-200',
  ready: 'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-red-100 text-red-600 border-red-200',
};

const NEXT_STATUS = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};

export default function AdminPhoneOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  const load = async () => {
    setLoading(true);
    const all = await base44.entities.Order.filter({ customer_email: 'phone-order@flavorisle.com' });
    setOrders((all || []).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    setLoading(false);
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.Order.subscribe(() => load());
    return unsub;
  }, []);

  const advance = async (order) => {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await base44.entities.Order.update(order.id, { status: next });
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o));
  };

  const cancel = async (order) => {
    await base44.entities.Order.update(order.id, { status: 'cancelled' });
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'cancelled' } : o));
  };

  const ACTIVE = ['pending', 'confirmed', 'preparing', 'ready'];
  const filtered = filter === 'active'
    ? orders.filter(o => ACTIVE.includes(o.status))
    : orders.filter(o => !ACTIVE.includes(o.status));

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-midnight-cherry rounded-2xl flex items-center justify-center">
              <Phone size={22} className="text-white" />
            </div>
            <div>
              <h1 className="font-heading text-2xl text-obsidian-roast">Phone Orders</h1>
              <p className="text-sm text-muted-foreground">Orders taken via Smashie AI</p>
            </div>
          </div>
          <button onClick={load} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-obsidian-roast transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {[{ key: 'active', label: 'Active' }, { key: 'past', label: 'Past' }].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-5 py-2 rounded-full text-sm font-heading transition-all ${filter === f.key ? 'bg-midnight-cherry text-white' : 'bg-white text-muted-foreground border border-border hover:border-midnight-cherry/40'}`}
            >
              {f.label}
              {f.key === 'active' && orders.filter(o => ACTIVE.includes(o.status)).length > 0 && (
                <span className="ml-2 bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{orders.filter(o => ACTIVE.includes(o.status)).length}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Phone size={48} strokeWidth={1} className="mx-auto mb-4 text-muted-foreground" />
            <p className="font-heading text-lg text-obsidian-roast">No {filter} phone orders</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(order => (
              <div key={order.id} className="card-diner p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-heading text-obsidian-roast">#{order.order_number}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-obsidian-roast">{order.customer_name}</p>
                    {order.customer_phone && <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone size={12} /> {order.customer_phone}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(order.created_date).toLocaleString()} · {order.order_type?.replace('_', ' ')}</p>
                    {order.special_instructions && <p className="text-xs italic text-patina-mint mt-1">"{order.special_instructions}"</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-heading text-midnight-cherry text-xl">${order.total?.toFixed(2)}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="mt-3 pt-3 border-t border-border space-y-1">
                  {(order.items || []).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-obsidian-roast">{item.quantity || 1}× {item.name}</span>
                      <span className="text-muted-foreground">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                {NEXT_STATUS[order.status] && (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => advance(order)}
                      className="flex-1 btn-cherry py-2.5 text-sm font-heading flex items-center justify-center gap-2"
                    >
                      <ChefHat size={16} />
                      Mark as {NEXT_STATUS[order.status]?.charAt(0).toUpperCase() + NEXT_STATUS[order.status]?.slice(1)}
                    </button>
                    <button onClick={() => cancel(order)} className="p-2.5 border border-border rounded-xl text-muted-foreground hover:text-destructive hover:border-destructive transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}