import React, { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';

export default function DailySpecialsSection() {
  const [specials, setSpecials] = useState([]);
  const [current, setCurrent] = useState(0);
  const { addItem, setIsCartOpen } = useCart();

  useEffect(() => {
    loadSpecials();
  }, []);

  const loadSpecials = async () => {
    const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
    const all = await base44.entities.DailySpecial.filter({ is_active: true });
    const filtered = (all || []).filter((s) => s.day_of_week === today || s.day_of_week === 'Daily');
    setSpecials(filtered);
  };

  if (specials.length === 0) return null;

  const special = specials[current];

  const handleAdd = () => {
    addItem({
      id: special.menu_item_id,
      name: special.menu_item_name,
      price: special.menu_item_price,
      image_url: special.menu_item_image
    });
    setIsCartOpen(true);
  };

  return (
    <section className="py-16 px-4 sm:px-6" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-midnight-cherry text-white px-4 py-1.5 rounded-full text-xs font-heading uppercase tracking-widest mb-3">
            <Zap size={12} /> Today's Specials
          </div>
          <h2 className="font-heading text-4xl text-obsidian-roast">Fresh From the Isle</h2>
        </div>

        <div className="relative card-diner overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Image */}
            <div className="relative h-64 md:h-auto min-h-64 bg-muted">
              {special.menu_item_image ?
              <img src={special.menu_item_image} alt={special.menu_item_name} className="w-full h-full object-cover" /> :

              <div className="w-full h-full flex items-center justify-center text-6xl">🍔</div>
              }
              <div className="absolute top-4 left-4 bg-midnight-cherry text-white px-3 py-1 rounded-full text-xs font-heading">
                {special.day_of_week}
              </div>
            </div>

            {/* Content */}
            <div className="p-8 flex flex-col justify-center">
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />)}
              </div>
              <h3 className="font-heading text-3xl text-obsidian-roast mb-2">{special.title}</h3>
              <p className="text-muted-foreground mb-2">{special.menu_item_name}</p>
              {special.description &&
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{special.description}</p>
              }
              <p className="font-heading text-3xl text-midnight-cherry mb-6">${special.menu_item_price?.toFixed(2)}</p>
              <button
                onClick={handleAdd}
                className="btn-cherry chrome-hover px-8 py-3.5 text-sm font-heading self-start">
                
                Add to Order
              </button>
            </div>
          </div>

          {/* Navigation arrows */}
          {specials.length > 1 &&
          <>
              <button
              onClick={() => setCurrent((p) => (p - 1 + specials.length) % specials.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shadow-float hover:bg-white transition-colors">
              
                <ChevronLeft size={18} />
              </button>
              <button
              onClick={() => setCurrent((p) => (p + 1) % specials.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 rounded-full flex items-center justify-center shadow-float hover:bg-white transition-colors">
              
                <ChevronRight size={18} />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {specials.map((_, i) =>
              <button key={i} onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-midnight-cherry w-5' : 'bg-gray-300'}`} />

              )}
              </div>
            </>
          }
        </div>
      </div>
    </section>);

}