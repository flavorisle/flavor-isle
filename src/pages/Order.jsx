import React, { useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ShoppingBag, Utensils, Bike, ArrowRight, Clock } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { base44 } from '@/api/base44Client';
import useLiveStatus from '@/hooks/useLiveStatus';
import useBusinessHours from '@/hooks/useBusinessHours';
import { DAY_KEYS, formatTime12 } from '@/lib/businessHours';

// Dedicated order-start landing page — the destination URL to list on the
// Google Business Profile "Food ordering" / "Order online" link so customers
// who tap it from Google Maps/Search land on a focused, conversion-first
// page instead of the full home page.
export default function Order() {
  const { setOrderType } = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const source = params.get('source') || 'google';
  const { level, waitMin, isClosed, closingSoon, closeTime, preOpen, minutesUntilOpen, openTime } = useLiveStatus();
  const businessHours = useBusinessHours();

  // Before the store opens for pickup, show "from {open}" instead of a minute
  // estimate so guests pre-ordering ahead know pickup starts at opening.
  const orderNow = new Date();
  const orderDayKey = DAY_KEYS[(orderNow.getDay() + 6) % 7];
  const orderTodayHours = businessHours?.[orderDayKey] || {};
  const beforeStoreOpen = !orderTodayHours.closed && orderTodayHours.open && (() => {
    const [oh, om] = orderTodayHours.open.split(':').map(Number);
    const so = new Date(orderNow); so.setHours(oh, om, 0, 0);
    return orderNow < so;
  })();
  const openFromLabel = beforeStoreOpen ? `from ${formatTime12(orderTodayHours.open)}` : null;

  useEffect(() => {
    base44.analytics.track({ eventName: 'order_landing_viewed', properties: { source } });
  }, [source]);

  const OPTIONS = [
    { id: 'pickup', label: 'Pickup', time: openFromLabel || `${Math.max(10, waitMin - 5)}–${waitMin + 5} min`, Icon: ShoppingBag, blurb: 'Grab it hot off the grill.' },
    { id: 'dine_in', label: 'Dine-In', time: openFromLabel || 'Seat yourself', Icon: Utensils, blurb: 'Pull up a seat and dig in.' },
    { id: 'delivery', label: 'Delivery', time: openFromLabel || `${waitMin + 15}–${waitMin + 25} min`, Icon: Bike, blurb: 'We bring it to your door.' },
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
            Hand-patted burgers, shakes & more — fired up fresh. Pick how you want it and we'll get it started.
          </p>
        </div>

        {/* Live status — driven by the kitchen busyness backend */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
            isClosed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
          }`}>
            <Clock size={14} />
            {isClosed ? 'Closed right now' : (level?.level || 'Open')}
          </span>
          {!isClosed && waitMin > 0 && (
            <span className="text-sm text-muted-foreground">~{waitMin} min wait</span>
          )}
          {closingSoon && closeTime && (
            <span className="text-sm font-semibold text-midnight-cherry">Closing soon · {closeTime}</span>
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

        {/* What to expect — links to the full guide with a live wait preview */}
        <Link
          to="/what-to-expect"
          className="mt-8 block rounded-2xl border-2 border-patina-mint/20 bg-white/70 p-5 hover:border-midnight-cherry/40 transition-colors group"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-midnight-cherry" />
              <h3 className="font-heading text-lg text-obsidian-roast">What to Expect</h3>
            </div>
            <ArrowRight size={18} className="text-muted-foreground group-hover:text-midnight-cherry group-hover:translate-x-1 transition-all" />
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {isClosed
              ? "We're closed right now — see our hours and busy times."
              : preOpen
                ? `Opening in ${minutesUntilOpen} min${openTime ? ` (${openTime})` : ''} — order ahead and we'll start cooking as soon as the grill's on.`
                : `Current wait: ~${waitMin || 20} min · ${level?.level || 'Running Smooth'}. Tap to see today's busy times and plan ahead.`}
          </p>
        </Link>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Ordered through Google? You're in the right place — tap an option above to start.
        </p>
      </div>
    </div>
  );
}