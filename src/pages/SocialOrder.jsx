import React, { useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, Phone, MapPin, Clock, Share2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { base44 } from '@/api/base44Client';
import useLiveStatus from '@/hooks/useLiveStatus';
import useBusinessHours from '@/hooks/useBusinessHours';
import { DAY_KEYS, formatTime12 } from '@/lib/businessHours';
import { pickupQuote, deliveryQuote } from '@/lib/waitQuote';
import { ORDER_TYPE_IMAGES } from '@/lib/orderTypeImages';
import OrderLoyaltySection from '@/components/order/OrderLoyaltySection';
import Seo from '@/components/Seo';

// Social order landing page — the link in the Instagram and Facebook bio and
// the link dropped in posts and stories. Same order flow as /order: pick a way
// to order, it sets the order type and opens the menu. Kept out of the sitemap
// and noindexed so /order stays the page that ranks for "order online".
export default function SocialOrder() {
  const { setOrderType } = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const source = params.get('source') || 'social';
  const { level, waitMin, deliveryEnabled, isClosed, closingSoon, closeTime, preOpen, minutesUntilOpen } = useLiveStatus();
  const businessHours = useBusinessHours();

  const orderNow = new Date();
  const orderDayKey = DAY_KEYS[(orderNow.getDay() + 6) % 7];
  const orderTodayHours = businessHours?.[orderDayKey] || {};
  const beforeStoreOpen = !orderTodayHours.closed && orderTodayHours.open && (() => {
    const [oh, om] = orderTodayHours.open.split(':').map(Number);
    const so = new Date(orderNow); so.setHours(oh, om, 0, 0);
    return orderNow < so;
  })();
  const openFromLabel = beforeStoreOpen ? `from ${formatTime12(orderTodayHours.open)}` : null;
  const todayHoursLabel = orderTodayHours.closed
    ? 'Closed today'
    : (orderTodayHours.open && orderTodayHours.close
      ? `${formatTime12(orderTodayHours.open)} \u2013 ${formatTime12(orderTodayHours.close)}`
      : null);

  useEffect(() => {
    base44.analytics.track({ eventName: 'order_landing_viewed', properties: { source } });
  }, [source]);

  // This page exists for bios and posts, not for search. /order keeps the ranking.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'robots');
    meta.setAttribute('content', 'noindex, follow');
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  const OPTIONS = [
    { id: 'pickup', label: 'Pickup', time: openFromLabel || pickupQuote(waitMin), art: ORDER_TYPE_IMAGES.pickup, blurb: 'Grab it hot off the grill.' },
    { id: 'dine_in', label: 'Dine-In', time: openFromLabel || 'Seat yourself', art: ORDER_TYPE_IMAGES.dine_in, blurb: 'Pull up a seat and dig in.' },
    { id: 'delivery', label: 'Delivery', time: openFromLabel || (deliveryEnabled ? deliveryQuote(waitMin) : 'Paused'), art: ORDER_TYPE_IMAGES.delivery, blurb: 'We bring it to your door.' },
  ];

  const start = (type) => {
    base44.analytics.track({ eventName: 'start_order_clicked', properties: { order_type: type, source } });
    setOrderType(type);
    navigate('/menu');
  };

  const share = async () => {
    const url = 'https://flavor-isle.com/social';
    const payload = {
      title: 'Flavor Isle \u2014 Order From Social',
      text: 'Hand-patted burgers, real-fruit shakes and hot fries in Smiths Grove, KY. Order ahead for pickup, curbside or dine-in.',
      url,
    };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share(payload); } catch { /* guest closed the sheet */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); } catch { /* clipboard blocked */ }
  };

  return (
    <div className="min-h-screen bg-vanilla-malt flex flex-col">
      <Seo
        path="/social"
        title="Order From Social — Flavor Isle | Smiths Grove, KY"
        description="Order Flavor Isle online for pickup, curbside or dine-in. Hand-patted burgers, real-fruit milkshakes and hot fries in Smiths Grove, KY, 0.7 mi off I-65 Exit 38."
        ogTitle="Order From Social — Flavor Isle"
        ogDescription="Hand-patted burgers, real-fruit shakes and hot fries, fired up fresh in Smiths Grove, KY. Order ahead for pickup, curbside or dine-in."
        ogImage="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/ff12a1c2b_IMG_0375.png"
        ogImageAlt="Double cheeseburger with lettuce, tomato and onion"
      />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 sm:py-14">
        <div className="text-center mb-8">
          <p className="font-heading text-midnight-cherry text-sm tracking-[0.3em] mb-2">FLAVOR ISLE</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-obsidian-roast leading-tight">Order From Social</h1>
          <p className="text-muted-foreground mt-3 text-base">
            You found us on social, so order right here. Hand-patted burgers, real-fruit shakes and hot fries, fired up fresh.
          </p>
        </div>

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

        <div className="grid gap-4">
          {OPTIONS.map(({ id, label, time, art, blurb }) => (
            <button
              key={id}
              onClick={() => start(id)}
              className="card-diner p-5 flex items-center gap-4 text-left tap-44 group"
            >
              <div className="w-14 h-14 flex items-center justify-center flex-shrink-0">
                <img src={art} alt={`Smashie ${label}`} width={52} height={52} className="w-[52px] h-[52px] object-contain" />
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

        <OrderLoyaltySection />

        <div className="mt-8 grid grid-cols-3 gap-3">
          <Link
            to="/menu"
            className="rounded-2xl border-2 border-patina-mint/20 bg-white/70 px-3 py-3 text-center hover:border-midnight-cherry/40 transition-colors"
          >
            <span className="text-sm font-semibold text-obsidian-roast">See the Menu</span>
          </Link>
          <a
            href="tel:+12705637230"
            className="rounded-2xl border-2 border-patina-mint/20 bg-white/70 px-3 py-3 text-center hover:border-midnight-cherry/40 transition-colors flex items-center justify-center gap-1.5"
          >
            <Phone size={15} className="text-midnight-cherry" />
            <span className="text-sm font-semibold text-obsidian-roast">Call Smashie</span>
          </a>
          <a
            href="https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border-2 border-patina-mint/20 bg-white/70 px-3 py-3 text-center hover:border-midnight-cherry/40 transition-colors flex items-center justify-center gap-1.5"
          >
            <MapPin size={15} className="text-midnight-cherry" />
            <span className="text-sm font-semibold text-obsidian-roast">Directions</span>
          </a>
        </div>

        <div className="mt-8 rounded-2xl border-2 border-patina-mint/20 bg-white/70 p-5">
          <p className="font-heading text-xs tracking-[0.2em] text-muted-foreground mb-3">FOLLOW THE ISLE</p>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://facebook.com/flavorisle"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-midnight-cherry text-white text-sm font-semibold px-4 py-2"
            >
              Facebook
            </a>
            <a
              href="https://instagram.com/flavor_isle"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-midnight-cherry text-white text-sm font-semibold px-4 py-2"
            >
              Instagram
            </a>
            <button
              type="button"
              onClick={share}
              className="rounded-full bg-white text-midnight-cherry border border-midnight-cherry text-sm font-semibold px-4 py-2 inline-flex items-center gap-1.5"
            >
              <Share2 size={14} />
              Share this page
            </button>
          </div>
        </div>

        <div className="text-center mt-6 space-y-1">
          <p className="text-xs text-muted-foreground">103 N Main St, Smiths Grove, KY 42171 &middot; 0.7 mi off I-65 Exit 38</p>
          {todayHoursLabel && <p className="text-xs text-muted-foreground">Open today {todayHoursLabel}</p>}
        </div>

        <p className="text-center text-sm text-obsidian-roast mt-8 font-semibold">
          Link in our bio? You are in the right place. Order ahead for pickup, curbside or dine-in.
        </p>
        {preOpen && minutesUntilOpen > 0 && (
          <p className="text-center text-xs text-muted-foreground mt-2">
            Opening in {minutesUntilOpen} min — order ahead and we will start cooking as soon as the grill is on.
          </p>
        )}
      </div>
    </div>
  );
}