import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { useCart } from '@/context/CartContext';

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
            Hungry? Let's Fix That.
          </h1>
          <p className="text-lg sm:text-xl mb-10 max-w-xl mx-auto font-body">
            Order online for pickup, delivery, or dine-in. Hot food, fast.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => handleOrder('pickup')}
              className="bg-white font-heading px-7 py-3.5 rounded-full text-sm sm:text-base hover:bg-vanilla-malt transition-colors chrome-hover"
              style={{ color: '#E3481C' }}
            >
              Order Now
            </button>
            <a
              href="tel:+12805634618"
              className="inline-flex items-center gap-2 border-2 border-white text-white font-heading px-7 py-3.5 rounded-full text-sm sm:text-base hover:bg-white/10 transition-colors"
            >
              <Phone size={16} /> Call Us
            </a>
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