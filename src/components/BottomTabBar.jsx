import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, UtensilsCrossed, User, ShoppingBag, Shirt, Bot } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { optimizedImageUrl } from '@/lib/utils';

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
    { to: '/merch', label: 'Merch', icon: Shirt },
    { cart: true, label: 'Bag', icon: ShoppingBag },
    { smashie: true, label: 'Smashie', icon: Bot },
    { to: '/account', label: 'Account', icon: User },
  ];

  // Tapping the tab you're already on scrolls smoothly back to the top
  // instead of re-navigating (native-app feel).
  const handleTabClick = (to) => {
    if (location.pathname === to) {
      // Already on this tab: snap back to the top and reset any transient
      // view state (active modals, query params, in-page search) so the
      // page returns to its clean default, then broadcast a retap event so
      // the active view can close its own modals / clear its search box.
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (location.search) {
        navigate(to, { replace: true });
      }
      window.dispatchEvent(new CustomEvent('flavorisle:tab-retap', { detail: { path: to } }));
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
      <div className="flex items-stretch justify-around h-20 px-1">
        {tabs.map((tab) => {
          const active = tab.to && location.pathname === tab.to;
          const Icon = tab.icon;
          const content = (
            <span className="flex flex-col items-center justify-center gap-1 w-full">
              <span className="relative">
                {tab.cart ? (
                  <img
                    src={optimizedImageUrl('https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7c5e40c67_shoppingcart.png', 160, 160, 'fit')}
                    alt="Your bag"
                    width="160"
                    height="160"
                    className="w-8 h-8 object-contain"
                  />
                ) : tab.smashie ? (
                  <img
                    src={optimizedImageUrl('https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/b05945903_smashiehead.png', 160, 160)}
                    alt="Smashie"
                    width="160"
                    height="160"
                    className={`w-8 h-8 object-cover rounded-full ${active ? 'ring-2 ring-midnight-cherry' : ''}`}
                  />
                ) : (
                  <Icon
                    size={26}
                    strokeWidth={active ? 2.6 : 2.1}
                    className={active ? 'text-midnight-cherry' : 'text-muted-foreground'}
                  />
                )}
                {tab.cart && totalItems > 0 && (
                  <span className="absolute -top-2 -right-2.5 bg-midnight-cherry text-white text-xs font-heading leading-none w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </span>
              <span className={`text-xs font-heading uppercase tracking-wide ${active ? 'text-midnight-cherry' : 'text-muted-foreground'}`}>
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
                aria-label={`Bag, ${totalItems} item${totalItems !== 1 ? 's' : ''}`}
              >
                {content}
              </button>
            );
          }

          if (tab.smashie) {
            return (
              <button
                key="smashie"
                onClick={() => window.dispatchEvent(new CustomEvent('flavorisle:open-smashie'))}
                className="tap-44 flex-1 flex items-center justify-center select-none"
                aria-label="Chat with Smashie"
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