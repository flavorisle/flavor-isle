import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ShoppingBag, Bike, Utensils } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import useLiveStatus from '@/hooks/useLiveStatus';
import { pickupQuote, deliveryQuote } from '@/lib/waitQuote';
import PopularTimesCard from '@/components/PopularTimesCard';

export default function HomeOrderOptions() {
  const navigate = useNavigate();
  const { setOrderType } = useCart();
  const { waitMin, deliveryEnabled } = useLiveStatus();
  const options = [
    { type: 'pickup', label: 'Pickup', time: pickupQuote(waitMin), Icon: ShoppingBag },
    { type: 'delivery', label: 'Delivery', time: deliveryEnabled ? deliveryQuote(waitMin) : 'Paused', Icon: Bike },
    { type: 'dine_in', label: 'Dine-In', time: 'Seat yourself', Icon: Utensils },
  ];
  const start = type => {
    base44.analytics.track({ eventName: 'start_order_clicked', properties: { order_type: type, source: 'hero' } });
    setOrderType(type);
    navigate('/menu');
  };
  return (
    <section className="bg-patina-mint text-white px-4 py-10 sm:py-14" aria-label="Choose how to order">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-center gap-3">
          {options.map(({ type, label, time, Icon }) => (
            <button key={type} type="button" onClick={() => start(type)}
              className="min-h-12 flex items-center gap-2 bg-card text-card-foreground font-heading px-5 py-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <Icon size={16} aria-hidden="true" />{label}<span className="text-sm font-body hidden sm:inline">{time}</span>
            </button>
          ))}
          <a href="tel:+12705634618" className="min-h-12 inline-flex items-center gap-2 border-2 border-white px-5 py-3 rounded-full font-heading"><Phone size={16} aria-hidden="true" />Call Us</a>
        </div>
        <div className="mt-8 rounded-2xl bg-[#1A3A5C] px-4 py-5 text-white">
          <div className="max-w-md mx-auto">
            <PopularTimesCard embedded />
          </div>
        </div>
      </div>
    </section>
  );
}