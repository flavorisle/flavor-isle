import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag, RefreshCw, Phone, Globe, Store, ChefHat, X,
  MapPin, Clock, Search, ChevronDown, ChevronUp, Receipt, Shirt, Banknote
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatChicagoDateTime } from '@/lib/chicagoTime';
import Navbar from '@/components/Navbar';
import AdminNav from '@/components/admin/AdminNav';
import OccupancyTracker from '@/components/OccupancyTracker';
import PhoneOrderSetup from '@/components/admin/PhoneOrderSetup';
import MerchOrdersList from '@/components/admin/MerchOrdersList';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  preparing: 'bg-orange-100 text-orange-700 border-orange-200',
  ready: 'bg-green-100 text-green-700 border-green-200',
  delivered: 'bg-teal-100 text-teal-700 border-teal-200',
  completed: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-red-100 text-red-600 border-red-200',
};

const PAYMENT_COLORS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  failed: 'bg-red-50 text-red-600 border-red-200',
  refunded: 'bg-purple-50 text-purple-700 border-purple-200',
};

const NEXT_STATUS = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];

// Detect where an order came from.
function getSource(order) {
  if (order.order_source === 'in_store') return 'pos';
  if (order.order_number?.startsWith('PH')) return 'phone';
  return 'online';
}

const SOURCES = [
  { key: 'all', label: 'All Sources', Icon: ShoppingBag },
  { key: 'pos', label: 'In-Person (POS)', Icon: Store },
  { key: 'online', label: 'Online', Icon: Globe },
  { key: 'phone', label: 'Phone', Icon: Phone },
];

const SOURCE_BADGE = {
  pos: { label: 'In-Person', class: 'bg-blue-100 text-blue-700 border-blue-200' },
  online: { label: 'Online', class: 'bg-purple-100 text-purple-700 border-purple-200' },
  phone: { label: 'Phone', class: 'bg-amber-100 text-amber-700 border-amber-200' },
};

function StatCard({ label, value, Icon, tone }) {
  const toneClass = {
    cherry: 'text-midnight-cherry',
    mint: 'text-patina-mint',
    amber: 'text-amber-600',
    gray: 'text-gray-500',
  }[tone] || 'text-obsidian-roast';
  return (
    <div className="card-diner p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-heading uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon size={16} className={toneClass} />
      </div>
      <p className={`font-heading text-2xl ${toneClass}`}>{value}</p>
    </div>
  );
}

function OrderCard({ order, onAdvance, onCancel, onMarkPaid }) {
  const [expanded, setExpanded] = useState(false);
  const source = getSource(order);
  const badge = SOURCE_BADGE[source];
  const items = order.items || [];
  const canAdvance = !!NEXT_STATUS[order.status];
  const isActive = ACTIVE_STATUSES.includes(order.status);
  const dueAtPickup = order.payment_method === 'pay_at_pickup' && order.payment_status === 'pending';

  return (
    <div className="card-diner overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left p-5 flex items-start justify-between gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {order.order_number && <p className="font-heading text-obsidian-roast">#{order.order_number}</p>}
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
              {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${badge.class}`}>
              {badge.label}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-semibold capitalize">
              {order.order_type?.replace('_', '-')}
            </span>
          </div>
          <p className="text-sm font-semibold text-obsidian-roast">{order.customer_name}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><Clock size={11} /> {formatChicagoDateTime(order.created_date)}</span>
            {order.customer_phone && <span className="flex items-center gap-1"><Phone size={11} /> {order.customer_phone}</span>}
            {order.delivery_address && <span className="flex items-center gap-1"><MapPin size={11} /> {order.delivery_address}</span>}
          </div>
          {!expanded && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {items.length} item{items.length !== 1 ? 's' : ''} · {items.slice(0, 2).map(i => i.name).join(', ')}{items.length > 2 ? '…' : ''}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <p className="font-heading text-midnight-cherry text-xl">${order.total?.toFixed(2)}</p>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold border ${dueAtPickup ? 'bg-midnight-cherry/10 text-midnight-cherry border-midnight-cherry/30' : (PAYMENT_COLORS[order.payment_status] || PAYMENT_COLORS.pending)}`}>
            {dueAtPickup ? 'Due at pickup' : order.payment_status}
          </span>
          {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-border pt-3">
          {order.special_instructions && (
            <p className="text-xs italic text-patina-mint mb-3">"{order.special_instructions}"</p>
          )}
          <div className="space-y-1 mb-3">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No items recorded.</p>
            ) : items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div className="text-obsidian-roast">
                  <span className="font-semibold">{item.quantity || 1}×</span> {item.name}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <span className="text-muted-foreground"> — {item.modifiers.map(m => m.name || m).join(', ')}</span>
                  )}
                </div>
                <span className="text-muted-foreground">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-xs text-muted-foreground border-t border-border pt-2 mb-3">
            <span>Subtotal</span><span>${order.subtotal?.toFixed(2) ?? '—'}</span>
          </div>
          {order.delivery_fee > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Delivery</span><span>${order.delivery_fee?.toFixed(2)}</span>
            </div>
          )}
          {order.tip > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Tip</span><span>${order.tip?.toFixed(2)}</span>
            </div>
          )}
          {order.discount > 0 && (
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Discount</span><span>-${order.discount?.toFixed(2)}</span>
            </div>
          )}

          {dueAtPickup && (
            <div className="mt-4 p-3 rounded-xl bg-midnight-cherry/5 border border-midnight-cherry/20">
              <p className="text-xs text-obsidian-roast mb-2">
                <span className="font-semibold">Collect ${order.total?.toFixed(2)} at the counter.</span>{' '}
                Paying by card? Pull up the saved ticket in Square POS (Orders → search #{order.order_number} or "{order.customer_name}") and take payment there.
              </p>
              <button
                onClick={() => onMarkPaid(order)}
                className="w-full btn-mint py-2.5 text-sm font-heading flex items-center justify-center gap-2"
              >
                <Banknote size={16} /> Mark Paid at Counter
              </button>
            </div>
          )}

          {isActive && (
            <div className="mt-4 flex gap-3">
              {canAdvance && (
                <button
                  onClick={() => onAdvance(order)}
                  className="flex-1 btn-cherry py-2.5 text-sm font-heading flex items-center justify-center gap-2"
                >
                  <ChefHat size={16} />
                  Mark as {NEXT_STATUS[order.status]?.charAt(0).toUpperCase() + NEXT_STATUS[order.status]?.slice(1)}
                </button>
              )}
              <button
                onClick={() => onCancel(order)}
                className="p-2.5 border border-border rounded-xl text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                aria-label="Cancel order"
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminOrders() {
  const [tab, setTab] = useState('food'); // 'food' | 'merch'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.Order.list('-created_date', 200);
      setOrders(all || []);
    } catch (e) {
      console.error('AdminOrders load error', e);
    } finally {
      setLoading(false);
    }
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

  const markPaid = async (order) => {
    await base44.entities.Order.update(order.id, { payment_status: 'paid' });
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, payment_status: 'paid' } : o));
  };

  const stats = useMemo(() => {
    const active = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
    const bySource = (src) => active.filter(o => getSource(o) === src);
    const revenue = active.reduce((sum, o) => sum + (o.total || 0), 0);
    return {
      totalActive: active.length,
      pos: bySource('pos').length,
      online: bySource('online').length,
      phone: bySource('phone').length,
      revenue,
    };
  }, [orders]);

  const filtered = useMemo(() => {
    let list = statusFilter === 'active'
      ? orders.filter(o => ACTIVE_STATUSES.includes(o.status))
      : orders.filter(o => !ACTIVE_STATUSES.includes(o.status));

    if (sourceFilter !== 'all') list = list.filter(o => getSource(o) === sourceFilter);
    if (typeFilter !== 'all') list = list.filter(o => o.order_type === typeFilter);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(o =>
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.customer_email || '').toLowerCase().includes(q) ||
        (o.customer_phone || '').toLowerCase().includes(q) ||
        (o.order_number || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, statusFilter, sourceFilter, typeFilter, search]);

  // Dine-in busyness indicator (from the old Phone Orders page)
  const dineInActive = orders.filter(o => o.order_type === 'dine_in' && ACTIVE_STATUSES.includes(o.status));
  const busynessLevel = dineInActive.length > 10 ? 'Packed' : dineInActive.length > 5 ? 'Busy' : dineInActive.length > 0 ? 'Moderate' : 'Quiet';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <AdminNav />

      {/* Hero */}
      <div className="bg-obsidian-roast py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-1">Admin</p>
            <h1 className="font-heading text-3xl text-white">Orders</h1>
            <p className="text-gray-300 mt-1 text-sm">Food, phone, POS & merch — all in one place</p>
          </div>
          {tab === 'food' && (
            <button onClick={load} className="flex items-center gap-2 btn-mint chrome-hover px-5 py-2.5 text-sm font-heading">
              <RefreshCw size={14} /> Refresh
            </button>
          )}
        </div>
      </div>

      {/* Tab switcher */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex gap-2">
          <button
            onClick={() => setTab('food')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-heading transition-all ${
              tab === 'food' ? 'bg-midnight-cherry text-white' : 'bg-white text-muted-foreground border border-border hover:border-midnight-cherry/40'
            }`}
          >
            <Receipt size={15} /> Food Orders
          </button>
          <button
            onClick={() => setTab('merch')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-heading transition-all ${
              tab === 'merch' ? 'bg-midnight-cherry text-white' : 'bg-white text-muted-foreground border border-border hover:border-midnight-cherry/40'
            }`}
          >
            <Shirt size={15} /> Merch Orders
          </button>
        </div>
      </div>

      {tab === 'food' ? (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Dine-in management widgets (folded in from the old Phone Orders page) */}
          <OccupancyTracker />
          <PhoneOrderSetup />

          {/* Dine-in busyness indicator */}
          <div className="mb-6 mt-6">
            <div className="card-diner p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Restaurant Status</p>
                <p className="font-heading text-lg text-obsidian-roast">
                  {dineInActive.length} Active Dine-In {dineInActive.length === 1 ? 'Order' : 'Orders'}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-sm font-heading px-3 py-1 rounded-full ${
                  dineInActive.length > 10 ? 'bg-red-100 text-red-700' :
                  dineInActive.length > 5 ? 'bg-orange-100 text-orange-700' :
                  dineInActive.length > 0 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {busynessLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Active Orders" value={stats.totalActive} Icon={ShoppingBag} tone="cherry" />
            <StatCard label="In-Person (POS)" value={stats.pos} Icon={Store} tone="mint" />
            <StatCard label="Online" value={stats.online} Icon={Globe} tone="mint" />
            <StatCard label="Phone" value={stats.phone} Icon={Phone} tone="amber" />
          </div>

          {/* Source tabs */}
          <div className="flex flex-wrap gap-2 mb-3">
            {SOURCES.map(({ key, label, Icon }) => {
              const count = key === 'all'
                ? orders.filter(o => ACTIVE_STATUSES.includes(o.status)).length
                : orders.filter(o => ACTIVE_STATUSES.includes(o.status) && getSource(o) === key).length;
              return (
                <button
                  key={key}
                  onClick={() => setSourceFilter(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-heading transition-all ${
                    sourceFilter === key
                      ? 'bg-midnight-cherry text-white'
                      : 'bg-white text-muted-foreground border border-border hover:border-midnight-cherry/40'
                  }`}
                >
                  <Icon size={14} /> {label}
                  {count > 0 && <span className="ml-1 bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* Status + type filters + search */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <div className="flex gap-2">
              {[{ key: 'active', label: 'Active' }, { key: 'past', label: 'Past' }].map(f => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-heading transition-all ${
                    statusFilter === f.key ? 'bg-patina-mint text-white' : 'bg-white text-muted-foreground border border-border hover:border-patina-mint/40'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {[{ key: 'all', label: 'All Types' }, { key: 'pickup', label: 'Pickup' }, { key: 'delivery', label: 'Delivery' }, { key: 'dine_in', label: 'Dine-In' }].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTypeFilter(t.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-heading transition-all ${
                    typeFilter === t.key ? 'bg-patina-mint text-white' : 'bg-white text-muted-foreground border border-border hover:border-patina-mint/40'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, phone, email, #…"
                className="w-full pl-9 pr-3 py-2 rounded-full text-sm bg-white border border-border focus:border-midnight-cherry focus:outline-none"
              />
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Receipt size={48} strokeWidth={1} className="mx-auto mb-4 text-muted-foreground" />
              <p className="font-heading text-lg text-obsidian-roast">No orders match your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(order => (
                <OrderCard key={order.id} order={order} onAdvance={advance} onCancel={cancel} onMarkPaid={markPaid} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <MerchOrdersList />
        </div>
      )}
    </div>
  );
}