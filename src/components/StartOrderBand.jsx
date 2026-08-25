import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Utensils, Bike } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { base44 } from '@/api/base44Client';

// Sticky order-type buttons that follow the user down the page, right under
// the navbar. No heading — just the pickup / dine-in / delivery shortcuts.
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
    <section className="sticky top-[112px] z-30 bg-white/95 backdrop-blur-md border-y border-border shadow-float">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap gap-3 justify-center">
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
    </section>
  );
}