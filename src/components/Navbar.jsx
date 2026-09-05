import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, Contrast } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useMerchCart } from '@/context/MerchCartContext';
import MerchCartButton from '@/components/merch/MerchCartButton';
import LiveStatusBar from '@/components/LiveStatusBar';
import { useAuth } from '@/lib/AuthContext';
import useHighContrast from '@/hooks/useHighContrast';
import NavMenuPanel from '@/components/NavMenuPanel';
import SiteNoticeBanner from '@/components/SiteNoticeBanner';

export default function Navbar() {
  const { totalItems, setIsCartOpen } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { enabled: highContrast, toggle: toggleHighContrast } = useHighContrast();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the dropdown whenever the route changes so it never lingers open
  // over the new page.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Sticky header: site notice + live status bar + main nav stay pinned together */}
      <div className="sticky top-0 z-50">
        <SiteNoticeBanner />
        <LiveStatusBar />
        <nav className={`relative transition-all duration-300 ${scrolled ? 'bg-white shadow-float py-3' : 'bg-vanilla-malt py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png" alt="Flavor Isle logo" className="w-12 h-12 object-contain flex-shrink-0 rounded-xl" />
            <div className="min-w-0 whitespace-nowrap">
              <div className="font-heading text-xl text-obsidian-roast leading-none">FLAVOR ISLE</div>
              <div className="text-xs text-patina-mint font-body tracking-widest">SMITHS GROVE, KY</div>
            </div>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleHighContrast}
              aria-pressed={highContrast}
              title="Toggle high contrast for easier reading"
              aria-label="Toggle high contrast"
              className={`p-2 rounded-full transition-colors tap-44 ${highContrast ? 'bg-smashie-yellow text-obsidian-roast' : 'text-obsidian-roast hover:bg-muted'}`}
            >
              <Contrast size={18} />
            </button>
            <a
              href="tel:+12705634618"
              aria-label="Call Flavor Isle"
              title="(270) 563-4618"
              className="hidden sm:inline-flex p-2 rounded-full text-obsidian-roast hover:bg-muted transition-colors tap-44"
            >
              <Phone size={18} />
            </a>
            <MerchCartButton />
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-1 rounded-full hover:opacity-90 transition">
              
              <img
                src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7c5e40c67_shoppingcart.png"
                alt="Cart"
                className="w-10 h-10 object-contain"
              />
              {totalItems > 0 &&
              <span className="absolute -top-1 -right-1 bg-patina-mint text-white text-xs font-heading w-5 h-5 rounded-full flex items-center justify-center animate-float-up">
                  {totalItems}
                </span>
              }
            </button>
            <button
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full font-heading text-sm tracking-wider transition-colors tap-44 ${
                mobileOpen ? 'bg-midnight-cherry text-white' : 'bg-muted text-obsidian-roast hover:bg-midnight-cherry hover:text-white'
              }`}
              onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              <span className="hidden sm:inline">MENU</span>
            </button>
          </div>
        </div>

        {mobileOpen &&
        <NavMenuPanel
          pathname={location.pathname}
          onClose={() => setMobileOpen(false)}
          isAuthenticated={isAuthenticated}
          user={user}
          logout={logout}
        />
        }
        </nav>
      </div>
    </>);

}