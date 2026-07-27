import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Utensils, Bike } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { base44 } from '@/api/base44Client';

// Prominent "Start an Order" entry placed right under the hero so guests can
// jump straight into ordering with one tap.
const OPTIONS = [
  { id: 'pickup', label: 'Pickup', time: '15–25 min', Icon: ShoppingBag },
  { id: 'dine_in', label: 'Dine-In', time: 'Seat yourself', Icon: Utensils },
  { id: 'delivery', label: 'Delivery', time: '35–50 min', Icon: Bike },
];

export default function StartOrderBand() {
  const { setOrderType } = useCart();
  const navigate = useNavigate();

  const start = (type) => {
    base44.analytics.track({ eventName: 'start_order_clicked', properties: { order_type: type, source: 'start_order_band' } });
    setOrderType(type);
    navigate('/menu');
  };

  return (
    <section className="sticky top-[64px] z-30 bg-white/95 backdrop-blur-md border-y border-border shadow-float">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0">
            <ArrowRight size={18} className="text-midnight-cherry" />
          </div>
          <div>
            <h2 className="font-heading text-xl text-obsidian-roast leading-none">Start an Order</h2>
            <p className="text-xs text-muted-foreground">Pick a way to get your food — we'll take you to the menu.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {OPTIONS.map(({ id, label, time, Icon }) => (
            <button
              key={id}
              onClick={() => start(id)}
              className="btn-cherry chrome-hover inline-flex items-center gap-2 px-5 py-3 text-sm"
            >
              <Icon size={16} />
              {label}
              <span className="text-xs font-body opacity-80 hidden sm:inline">{time}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}