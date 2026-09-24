import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';

// Mobile-only fixed bottom bar that keeps the ORDER NOW action visible while
// scrolling the homepage and menu. Sits above the BottomTabBar and respects
// safe-area insets so it never covers the cart tab or other tap targets.
const ORDER_TYPES = [
  { key: 'pickup', label: 'Pickup', orderType: 'pickup', method: 'counter' },
  { key: 'curbside', label: 'Curbside', orderType: 'pickup', method: 'curbside' },
  { key: 'delivery', label: 'Delivery', orderType: 'delivery' },
];

export default function StickyOrderBar() {
  const { orderType, setOrderType, pickupMethod, setPickupMethod, orderingEnabled } = useCart();
  const navigate = useNavigate();

  if (!orderingEnabled) return null;

  const isActive = (opt) => orderType === opt.orderType && (!opt.method || pickupMethod === opt.method);

  return (
    <>
      {/* Spacer so page content can scroll past the fixed bar */}
      <div className="md:hidden" style={{ height: '3.5rem' }} aria-hidden="true" />

      <div
        className="md:hidden fixed inset-x-0 z-30 bg-white border-t-2 border-midnight-cherry/20 shadow-float-lg"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex gap-0.5 bg-muted rounded-full p-0.5 flex-shrink-0">
            {ORDER_TYPES.map(opt => (
              <button
                key={opt.key}
                onClick={() => { setOrderType(opt.orderType); if (opt.method) setPickupMethod(opt.method); }}
                className={`px-2.5 py-1.5 text-xs font-heading rounded-full transition-all whitespace-nowrap ${
                  isActive(opt) ? 'bg-midnight-cherry text-white' : 'text-muted-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs text-patina-mint font-heading whitespace-nowrap flex-shrink-0">
            <Clock size={12} /> ~15 min
          </div>

          <button
            onClick={() => navigate('/menu')}
            className="btn-cherry chrome-hover flex-1 py-2.5 text-sm font-heading flex items-center justify-center gap-1.5 min-w-0"
          >
            Order Now <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </>
  );
}