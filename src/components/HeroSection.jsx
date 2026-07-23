import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, ShoppingBag, Bike, Utensils } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import BusynessStatus from '@/components/BusynessStatus';

const STATS = [
  { num: '3.4M', label: 'BURGERS SERVED SINCE 1964' },
  { num: '1.8M', label: 'SHAKES SPUN & STILL SWIRLING' },
  { num: '60+', label: 'YEARS SERVING SMITHS GROVE' },
  { num: '0', label: 'SHORTCUTS. EVER.' },
];

export default function HeroSection() {
  const navigate = useNavigate();
  const { setOrderType } = useCart();

  const handleOrder = (type) => {
    setOrderType(type);
    navigate('/menu');
  };

  return (
    <section className="overflow-hidden">
      {/* Orange hero block */}
      <div style={{ background: '#E3481C' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24 pb-16 text-center text-white">
          <h1 className="font-heading uppercase leading-[1.05] text-5xl sm:text-6xl md:text-7xl mb-5">
            Real Food.<br />Real Good.
          </h1>
          <p className="text-lg sm:text-xl mb-10 max-w-xl mx-auto font-body">
            Smiths Grove's classic American diner. Hand-smashed burgers, thick shakes, and homestyle cooking made fresh every day.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            {[
              { type: 'pickup', label: 'Pickup', time: '15–25 min', Icon: ShoppingBag },
              { type: 'delivery', label: 'Delivery', time: '35–50 min', Icon: Bike },
              { type: 'dine_in', label: 'Dine-In', time: 'Seat yourself', Icon: Utensils },
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
              href="tel:+12805634618"
              className="inline-flex items-center gap-2 border-2 border-white text-white font-heading px-5 sm:px-6 py-3.5 rounded-full text-sm sm:text-base hover:bg-white/10 transition-colors"
            >
              <Phone size={16} /> Call Us
            </a>
          </div>

          {/* Live status card */}
          <div className="mt-10 max-w-md mx-auto">
            <BusynessStatus />
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