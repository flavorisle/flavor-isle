import React from 'react';
import { Shirt, Truck, ExternalLink } from 'lucide-react';
import MerchStatusTimeline from '@/components/merch/MerchStatusTimeline';

const HEADLINES = {
  pending: 'We got your order — locking in payment.',
  paid: 'Order confirmed — heading to the print shop.',
  placed: "It's with the print shop. Ink drops soon.",
  in_production: 'Your gear is being printed right now. 🎨',
  fulfilled: "Printing's done — it's getting boxed up.",
  shipped: 'Your gear is on the way! 📦',
  canceled: 'This order got cut.',
  failed: 'Something went sideways with fulfillment.',
};

// Customer-facing status card for a Tasty Threads merch order.
export default function MerchOrderStatusCard({ order }) {
  const status = order.fulfillment_status || 'pending';
  const bad = status === 'canceled' || status === 'failed';
  return (
    <div className="card-diner overflow-hidden animate-float-up">
      <div className="px-6 py-7 text-white" style={{ background: bad ? '#8a0016' : status === 'shipped' ? '#C0392B' : '#1A3A5C' }}>
        <div className="flex items-center gap-3 mb-2">
          <Shirt size={22} />
          <span className="font-heading uppercase tracking-widest text-xs opacity-90">Tasty Threads · Order #{order.order_number}</span>
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl leading-tight">{HEADLINES[status] || HEADLINES.pending}</h2>
      </div>

      <div className="px-6 py-6">
        <MerchStatusTimeline order={order} />
        {order.tracking_number && (
          <a
            href={order.tracking_url || `https://tools.usps.com/go/TrackConfirmAction?tLabels=${order.tracking_number}`}
            target="_blank" rel="noopener noreferrer"
            className="btn-cherry chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm mt-5"
          >
            <Truck size={16} /> Track Package <ExternalLink size={14} />
          </a>
        )}
        {(order.items || []).length > 0 && (
          <div className="bg-muted/60 rounded-2xl p-4 space-y-2 mt-5">
            {order.items.map((it, idx) => (
              <div key={idx} className="flex justify-between text-sm font-body">
                <span className="text-obsidian-roast">{it.name}{it.variant_name ? ` — ${it.variant_name}` : ''}{(it.quantity || 1) > 1 ? ` ×${it.quantity}` : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}