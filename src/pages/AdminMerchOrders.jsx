// Admin — Tasty Threads / Printful merch orders.
import React, { useState, useEffect } from 'react';
import { Shirt, Truck, RefreshCw, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import AdminNav from '@/components/admin/AdminNav';

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-600',
  paid: 'bg-blue-100 text-blue-700',
  placed: 'bg-indigo-100 text-indigo-700',
  in_production: 'bg-amber-100 text-amber-700',
  fulfilled: 'bg-purple-100 text-purple-700',
  shipped: 'bg-green-100 text-green-700',
  canceled: 'bg-red-100 text-red-700',
  failed: 'bg-red-100 text-red-700',
};

export default function AdminMerchOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.MerchOrder.list('-created_date', 100);
      setOrders(list || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const retryFulfill = async (order) => {
    setRetrying(order.id);
    try {
      await base44.functions.invoke('createPrintfulOrder', { merchOrderId: order.id });
      await load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Retry failed');
    } finally {
      setRetrying(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <AdminNav />
      <div className="bg-obsidian-roast py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Shirt size={24} className="text-[hsl(var(--primary))]" />
            <p className="text-sm font-heading uppercase tracking-widest text-[hsl(var(--primary))]">TASTY THREADS</p>
          </div>
          <h1 className="font-heading text-4xl text-white">Merch Orders</h1>
          <p className="text-gray-300 mt-3">Track Printful fulfillment and shipping for every merch order.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <p className="font-heading text-sm text-obsidian-roast uppercase tracking-widest">
            {loading ? 'Loading…' : `${orders.length} order${orders.length !== 1 ? 's' : ''}`}
          </p>
          <button onClick={load} className="text-sm text-patina-mint hover:text-midnight-cherry inline-flex items-center gap-1 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {orders.length === 0 && !loading ? (
          <div className="card-diner p-12 text-center">
            <Shirt size={40} className="text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No merch orders yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="card-diner p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-heading text-lg text-obsidian-roast">{order.order_number || '—'}</p>
                    <p className="text-sm text-muted-foreground">{order.customer_name} · {order.customer_email}</p>
                    {order.customer_phone && <p className="text-xs text-muted-foreground">{order.customer_phone}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs font-heading px-3 py-1 rounded-full ${STATUS_COLORS[order.fulfillment_status] || STATUS_COLORS.pending}`}>
                      {order.fulfillment_status || 'pending'}
                    </span>
                    <span className="text-xs text-muted-foreground">Payment: {order.payment_status}</span>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground mb-3">
                  {(order.shipping_address?.address1 || '')}, {(order.shipping_address?.city || '')}, {order.shipping_address?.state_code || ''} {order.shipping_address?.zip || ''}
                </div>

                <div className="space-y-1 mb-3">
                  {(order.items || []).map((it, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-obsidian-roast">{it.name} {it.variant_name ? `— ${it.variant_name}` : ''} × {it.quantity}</span>
                      <span className="text-muted-foreground">${((it.price || 0) * (it.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total: </span>
                    <span className="font-heading text-obsidian-roast">${(order.total || 0).toFixed(2)}</span>
                    {order.printful_order_id && <span className="text-xs text-muted-foreground ml-3">Printful #{order.printful_order_id}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    {order.tracking_number && (
                      <a
                        href={order.tracking_url || `https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-sm text-patina-mint hover:text-midnight-cherry inline-flex items-center gap-1"
                      >
                        <Truck size={14} /> {order.tracking_number} <ExternalLink size={12} />
                      </a>
                    )}
                    {order.payment_status === 'paid' && !order.printful_order_id && (
                      <button
                        onClick={() => retryFulfill(order)}
                        disabled={retrying === order.id}
                        className="text-sm text-midnight-cherry hover:underline inline-flex items-center gap-1 disabled:opacity-60"
                      >
                        {retrying === order.id ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />} Retry Printful
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}