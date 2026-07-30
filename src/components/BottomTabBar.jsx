import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, UtensilsCrossed, User, ShoppingBag } from 'lucide-react';
import { useCart } from '@/context/CartContext';

// Routes where the persistent bottom tab bar would conflict with a
// full-screen flow (e.g. the sticky checkout CTA), so we hide it.
const HIDDEN_PATHS = ['/checkout', '/order-confirmation'];

export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItems, setIsCartOpen } = useCart();

  if (HIDDEN_PATHS.includes(location.pathname)) return null;

  const tabs = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { cart: true, label: 'Cart', icon: ShoppingBag },
    { to: '/account', label: 'Account', icon: User },
  ];

  // Tapping the tab you're already on scrolls smoothly back to the top
  // instead of re-navigating (native-app feel).
  const handleTabClick = (to) => {
    if (location.pathname === to) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      navigate(to);
    }
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 glass-tab"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Primary"
    >
      <div className="flex items-stretch justify-around h-16 px-1">
        {tabs.map((tab) => {
          const active = tab.to && location.pathname === tab.to;
          const Icon = tab.icon;
          const content = (
            <span className="flex flex-col items-center justify-center gap-0.5 w-full">
              <span className="relative">
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 2}
                  className={active ? 'text-midnight-cherry' : 'text-muted-foreground'}
                />
                {tab.cart && totalItems > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-midnight-cherry text-white text-[10px] font-heading leading-none w-4 h-4 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-heading uppercase tracking-wide ${active ? 'text-midnight-cherry' : 'text-muted-foreground'}`}>
                {tab.label}
              </span>
            </span>
          );

          if (tab.cart) {
            return (
              <button
                key="cart"
                onClick={() => setIsCartOpen(true)}
                className="tap-44 flex-1 flex items-center justify-center select-none"
                aria-label={`Cart, ${totalItems} item${totalItems !== 1 ? 's' : ''}`}
              >
                {content}
              </button>
            );
          }

          return (
            <button
              key={tab.to}
              onClick={() => handleTabClick(tab.to)}
              className="tap-44 flex-1 flex items-center justify-center select-none"
              aria-current={active ? 'page' : undefined}
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}