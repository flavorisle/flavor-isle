import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, ShoppingBag, Bike, Utensils } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { base44 } from '@/api/base44Client';
import PopularTimesCard from '@/components/PopularTimesCard';
import useOrderTimes from '@/hooks/useOrderTimes';

const STATS = [
  { num: '3.4M', label: 'BURGERS SERVED' },
  { num: '1.8M', label: 'SHAKES SPUN & STILL SWIRLING' },
  { num: '100%', label: 'FRESH, NEVER-FROZEN BEEF' },
  { num: '0', label: 'SHORTCUTS. EVER.' },
];

// Fast, always-available hero photo so the hero paints with a real image
// immediately instead of the brown gradient fallback. If the OneDrive media
// lookup resolves, the storefront sign photo swaps in on top.
const DEFAULT_HERO_PHOTO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/1503a227d_IMG_0428.jpg';

export default function HeroSection() {
  const navigate = useNavigate();
  const { setOrderType } = useCart();
  const { pickup: pickupTime, delivery: deliveryTime, dineIn } = useOrderTimes();

  const handleOrder = (type) => {
    base44.analytics.track({ eventName: 'start_order_clicked', properties: { order_type: type, source: 'hero' } });
    setOrderType(type);
    navigate('/menu');
  };

  return (
    <section className="overflow-hidden">
      {/* Hero block with storefront photo */}
      <div
        className="relative bg-cover bg-center"
        style={{
          backgroundImage: `url('${DEFAULT_HERO_PHOTO}')`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/70" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16 text-center text-white">
          {/* Est. 1964 seal */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex flex-col items-center justify-center w-20 h-20 rounded-full border-2 border-white/80 bg-white/10 backdrop-blur-sm">
              <span className="font-heading text-[10px] tracking-[0.2em] text-white/90 leading-none">EST.</span>
              <span className="font-heading text-2xl leading-none my-0.5" style={{ color: '#F5A623' }}>1964</span>
              <span className="font-heading text-[9px] tracking-[0.15em] text-white/80 leading-none">SMITHS GROVE</span>
            </div>
          </div>
          <h1 className="font-heading uppercase leading-[1.05] text-5xl sm:text-6xl md:text-7xl mb-5 drop-shadow-lg">
            Real Food.<br />Real Good.
          </h1>
          <p className="text-lg sm:text-xl mb-10 max-w-xl mx-auto font-body drop-shadow">
            Smiths Grove's favorite burger restaurant, just off I-65 near Bowling Green. Fresh, never-frozen hand-patted smash burgers, thick milkshakes, and hot sides — made fresh every day. Order online for pickup or delivery, or dine in with us.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {[
              { type: 'pickup', label: 'Pickup', time: pickupTime, Icon: ShoppingBag },
              { type: 'delivery', label: 'Delivery', time: deliveryTime, Icon: Bike },
              { type: 'dine_in', label: 'Dine-In', time: dineIn, Icon: Utensils },
            ].map(({ type, label, time, Icon }) => (
              <button
                key={type}
                onClick={() => handleOrder(type)}
                className="inline-flex items-center gap-2 bg-white font-heading px-5 sm:px-6 py-3.5 rounded-full text-sm sm:text-base hover:bg-vanilla-malt transition-colors chrome-hover"
                style={{ color: '#E3481C' }}
              >
                <Icon size={16} />
                <span>{label}</span>
                <span className="text-xs font-body opacity-70 hidden sm:inline">{time}</span>
              </button>
            ))}
            <a
              href="tel:+12705634618"
              className="inline-flex items-center gap-2 border-2 border-white text-white font-heading px-5 sm:px-6 py-3.5 rounded-full text-sm sm:text-base hover:bg-white/10 transition-colors"
            >
              <Phone size={16} /> Call Us
            </a>
          </div>

          {/* Live busy graph */}
          <div className="mt-10">
            <PopularTimesCard embedded />
          </div>
        </div>
      </div>

      {/* Navy stats block */}
      <div style={{ background: '#0B355A' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
          <div className="grid grid-cols-2 gap-8 sm:gap-12">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="font-heading text-5xl sm:text-6xl mb-2 leading-none" style={{ color: '#E3481C' }}>
                  {s.num}
                </div>
                <div className="text-[11px] sm:text-sm uppercase tracking-widest text-white/80 font-body">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}