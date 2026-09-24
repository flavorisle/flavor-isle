import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import AdminNav from '@/components/admin/AdminNav';
import { RefreshCw, ChefHat, Clock, CheckCircle, AlertCircle, MapPin, Phone, Utensils, Bike, ShoppingBag, Flame } from 'lucide-react';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];

const STATUS_STYLES = {
  pending: { ring: 'border-yellow-300', badge: 'bg-yellow-200 text-yellow-800', label: 'Pending' },
  confirmed: { ring: 'border-midnight-cherry', badge: 'bg-midnight-cherry text-white', label: 'New' },
  preparing: { ring: 'border-orange-400', badge: 'bg-orange-500 text-white', label: 'Cooking' },
  ready: { ring: 'border-green-500', badge: 'bg-green-600 text-white', label: 'Ready' },
};

const ORDER_TYPE_ICON = { pickup: ShoppingBag, delivery: Bike, dine_in: Utensils };
const ORDER_TYPE_LABEL = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' };

function minutesAgo(date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  return `${mins} min ago`;
}

function formatModifiers(item) {
  const mods = item.selectedModifiers || [];
  if (!mods.length) return null;
  return mods.map(m => m.name || m).join(', ');
}

export default function AdminKitchen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const refreshTimer = useRef(null);

  const loadOrders = async () => {
    try {
      const recent = await base44.entities.Order.list('-created_date', 60);
      const active = (recent || [])
        .filter(o => ACTIVE_STATUSES.includes(o.status))
        .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
      setOrders(active);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load kitchen orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 20000);
    const unsubscribe = base44.entities.Order.subscribe(() => {
      // Debounce — refresh at most once per 3 seconds when events stream in.
      if (refreshTimer.current) return;
      refreshTimer.current = setTimeout(() => { loadOrders(); refreshTimer.current = null; }, 3000);
    });
    return () => { clearInterval(interval); unsubscribe(); if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, []);

  const receivedCount = orders.filter(o => o.square_order_id).length;
  const waitingCount = orders.length - receivedCount;

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-midnight-cherry/10 rounded-full flex items-center justify-center">
              <Flame size={24} className="text-midnight-cherry" />
            </div>
            <div>
              <h1 className="font-heading text-3xl text-obsidian-roast leading-none">Kitchen Display</h1>
              <p className="text-xs text-muted-foreground mt-1">
                {orders.length} active · {receivedCount} received · {waitingCount} waiting for sync
                {lastRefresh && <span className="ml-2">· updated {minutesAgo(lastRefresh)}</span>}
              </p>
            </div>
          </div>
          <button onClick={loadOrders} disabled={loading} className="btn-mint px-4 py-2 text-xs flex items-center gap-2">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-24">
            <RefreshCw size={28} className="animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-3">Loading orders…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-24">
            <ChefHat size={48} className="mx-auto text-muted-foreground/40" />
            <p className="font-heading text-xl text-obsidian-roast mt-4">No active orders</p>
            <p className="text-sm text-muted-foreground mt-1">The grill's quiet — new orders will appear here instantly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map(order => {
              const style = STATUS_STYLES[order.status] || STATUS_STYLES.confirmed;
              const received = !!order.square_order_id;
              const TypeIcon = ORDER_TYPE_ICON[order.order_type] || ShoppingBag;
              const ageMin = Math.floor((Date.now() - new Date(order.created_date).getTime()) / 60000);
              const isOld = ageMin >= 15;

              return (
                <div key={order.id} className={`card-diner p-5 border-2 ${style.ring} ${received ? '' : 'border-dashed'}`}>
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading text-2xl text-obsidian-roast">#{order.order_number}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-heading ${style.badge}`}>{style.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <Clock size={12} className={isOld ? 'text-red-500' : ''} />
                        <span className={isOld ? 'text-red-500 font-semibold' : ''}>{minutesAgo(order.created_date)}</span>
                      </div>
                    </div>
                    {/* Received badge — the key indicator */}
                    {received ? (
                      <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-heading flex-shrink-0">
                        <CheckCircle size={14} />
                        Received
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-full text-xs font-heading flex-shrink-0">
                        <AlertCircle size={14} className="animate-pulse" />
                        Syncing…
                      </div>
                    )}
                  </div>

                  {/* Order type + customer */}
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
                    <div className="inline-flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full text-xs font-heading text-obsidian-roast">
                      <TypeIcon size={13} />
                      {ORDER_TYPE_LABEL[order.order_type] || order.order_type}
                      {order.order_type === 'pickup' && order.pickup_method === 'curbside' && ' · Curbside'}
                    </div>
                    <span className="text-sm text-obsidian-roast font-semibold truncate">{order.customer_name}</span>
                  </div>

                  {/* Items */}
                  <div className="space-y-2 mb-3">
                    {(order.items || []).map((item, idx) => {
                      const qty = item.quantity || 1;
                      const mods = formatModifiers(item);
                      return (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="font-heading text-lg text-midnight-cherry flex-shrink-0 w-7 text-center">{qty}×</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-obsidian-roast font-semibold leading-tight">{item.name}</p>
                            {mods && <p className="text-xs text-muted-foreground mt-0.5">+ {mods}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Special instructions */}
                  {order.special_instructions && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-2.5 mb-3">
                      <p className="text-xs font-heading text-yellow-800 mb-0.5">⚠ Special Instructions</p>
                      <p className="text-xs text-yellow-800 break-words">{order.special_instructions}</p>
                    </div>
                  )}

                  {/* Footer: contact + delivery address */}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-2 border-t border-border">
                    {order.customer_phone && (
                      <div className="inline-flex items-center gap-1">
                        <Phone size={12} /> {order.customer_phone}
                      </div>
                    )}
                    {order.order_type === 'delivery' && order.delivery_address && (
                      <div className="inline-flex items-center gap-1 min-w-0">
                        <MapPin size={12} className="flex-shrink-0" />
                        <span className="truncate">{order.delivery_address}</span>
                      </div>
                    )}
                    {order.order_type === 'dine_in' && order.table_number && (
                      <div className="inline-flex items-center gap-1">
                        <Utensils size={12} /> Table {order.table_number}
                      </div>
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