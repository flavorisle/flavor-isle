import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Utensils, Bike, ArrowRight, Clock } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { base44 } from '@/api/base44Client';
import useLiveStatus from '@/hooks/useLiveStatus';

// Dedicated order-start landing page — the destination URL to list on the
// Google Business Profile "Food ordering" / "Order online" link so customers
// who tap it from Google Maps/Search land on a focused, conversion-first
// page instead of the full home page.
export default function Order() {
  const { setOrderType } = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const source = params.get('source') || 'google';
  const { level, waitMin, isOpen } = useLiveStatus();

  useEffect(() => {
    base44.analytics.track({ eventName: 'order_landing_viewed', properties: { source } });
  }, [source]);

  const OPTIONS = [
    { id: 'pickup', label: 'Pickup', time: `${Math.max(10, waitMin - 5)}–${waitMin + 5} min`, Icon: ShoppingBag, blurb: 'Grab it hot off the grill.' },
    { id: 'dine_in', label: 'Dine-In', time: 'Seat yourself', Icon: Utensils, blurb: 'Pull up a seat and dig in.' },
    { id: 'delivery', label: 'Delivery', time: `${waitMin + 15}–${waitMin + 25} min`, Icon: Bike, blurb: 'We bring it to your door.' },
  ];

  const start = (type) => {
    base44.analytics.track({ eventName: 'start_order_clicked', properties: { order_type: type, source } });
    setOrderType(type);
    navigate('/menu');
  };

  return (
    <div className="min-h-screen bg-vanilla-malt flex flex-col">
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-center mb-8">
          <p className="font-heading text-midnight-cherry text-sm tracking-[0.3em] mb-2">FLAVOR ISLE</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-obsidian-roast leading-tight">Order Online</h1>
          <p className="text-muted-foreground mt-3 text-base">
            Smash burgers, shakes & more — fired up fresh. Pick how you want it and we'll get it started.
          </p>
        </div>

        {/* Live status */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
            !isOpen ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            <Clock size={14} />
            {!isOpen ? 'Closed right now' : level || 'Open'}
          </span>
          {isOpen && waitMin > 0 && (
            <span className="text-sm text-muted-foreground">~{waitMin} min wait</span>
          )}
        </div>

        {/* Order type cards */}
        <div className="grid gap-4">
          {OPTIONS.map(({ id, label, time, Icon, blurb }) => (
            <button
              key={id}
              onClick={() => start(id)}
              className="card-diner p-5 flex items-center gap-4 text-left tap-44 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-midnight-cherry/10 text-midnight-cherry flex items-center justify-center flex-shrink-0">
                <Icon size={26} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-heading text-xl text-obsidian-roast">{label}</h2>
                  <span className="text-sm font-semibold text-patina-mint flex-shrink-0">{time}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{blurb}</p>
              </div>
              <ArrowRight size={20} className="text-muted-foreground group-hover:text-midnight-cherry group-hover:translate-x-1 transition-all flex-shrink-0" />
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Ordered through Google? You're in the right place — tap an option above to start.
        </p>
      </div>
    </div>
  );
}