import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, MapPin, Phone, LogOut } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/lib/AuthContext';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursSummary } from '@/lib/businessHours';

export default function Navbar() {
  const { totalItems, setIsCartOpen } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const businessHours = useBusinessHours();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
  { label: 'Menu', to: '/menu' },
  { label: 'Milkshakes', to: '/milkshakes' },
  { label: 'Promos', to: '/promos' },
  { label: 'Meet Smashie', to: '/meet-smashie' },
  { label: 'Track Order', to: '/order-status' },
  { label: 'Store Locator', to: '/store-locator' },
  { label: 'Kitchen Status', to: '/kitchen-status' },
  { label: 'FAQ', to: '/faq' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'My Account', to: '/account' }];


  return (
    <>
      {/* Top bar */}
      <div className="bg-obsidian-roast text-white text-sm py-2 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <MapPin size={12} className="text-patina-mint" />
            <span className="hidden sm:inline">Smiths Grove, KY</span>
          </span>
          <span className="flex items-center gap-1">
            <Phone size={12} className="text-patina-mint" />
            <a href="tel:+12705634618" className="hover:text-patina-mint transition-colors">(270) 563-4618</a>
          </span>
        </div>
        <div className="text-xs text-gray-400">{hoursSummary(businessHours)}</div>
      </div>

      {/* Main Nav */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-float py-3' : 'bg-vanilla-malt py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png" alt="Flavor Isle logo" className="w-12 h-12 object-contain flex-shrink-0 rounded-full" />
            <div className="min-w-0 whitespace-nowrap">
              <div className="font-heading text-xl text-obsidian-roast leading-none">FLAVOR ISLE</div>
              <div className="text-xs text-patina-mint font-body tracking-widest">SMITHS GROVE, KY</div>
            </div>
          </Link>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 bg-midnight-cherry text-white rounded-full hover:bg-red-800 transition-colors">
              
              <ShoppingBag size={18} />
              {totalItems > 0 &&
              <span className="absolute -top-1 -right-1 bg-patina-mint text-white text-xs font-heading w-5 h-5 rounded-full flex items-center justify-center animate-float-up">
                  {totalItems}
                </span>
              }
            </button>
            <button
              className="p-2 text-obsidian-roast"
              onClick={() => setMobileOpen(!mobileOpen)}>
              
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Menu */}
        {mobileOpen &&
        <div className="bg-white border-t border-border px-4 py-4 flex flex-col gap-4">
            {navLinks.map((link) =>
          <Link
            key={link.to}
            to={link.to}
            onClick={() => setMobileOpen(false)}
            className="font-body font-semibold text-obsidian-roast hover:text-midnight-cherry transition-colors">
            
                {link.label}
              </Link>
          )}
            <Link
            to="/menu"
            onClick={() => setMobileOpen(false)}
            className="btn-cherry chrome-hover px-5 py-3 text-center text-sm font-heading">
            
              Order Now
            </Link>
            
            {/* Auth Section */}
            <div className="border-t border-border pt-4 mt-2">
              {isAuthenticated ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground font-body">Signed in as <span className="font-semibold text-obsidian-roast">{user?.full_name || user?.email}</span></p>
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-body text-obsidian-roast hover:bg-muted rounded-lg transition-colors">
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center px-4 py-2.5 bg-patina-mint text-white rounded-lg text-sm font-heading hover:bg-opacity-90 transition-colors">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        }
      </nav>
    </>);

}