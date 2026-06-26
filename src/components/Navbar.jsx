import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, Menu, X, MapPin, Phone } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function Navbar() {
  const { totalItems, setIsCartOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Menu', to: '/menu' },
    { label: 'About', to: '/about' },
    { label: 'Contact', to: '/contact' },
  ];

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
            <a href="tel:+12705635000" className="hover:text-patina-mint transition-colors">(270) 563-5000</a>
          </span>
        </div>
        <div className="text-xs text-gray-400">Mon–Sun: 7AM – 10PM</div>
      </div>

      {/* Main Nav */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-float py-3' : 'bg-vanilla-malt py-4'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-midnight-cherry rounded-full flex items-center justify-center text-white font-heading text-lg">FI</div>
            <div>
              <div className="font-heading text-xl text-obsidian-roast leading-none">FLAVOR ISLE</div>
              <div className="text-xs text-patina-mint font-body tracking-widest">SMITHS GROVE, KY</div>
            </div>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-body font-semibold text-sm tracking-wide transition-colors hover:text-midnight-cherry ${location.pathname === link.to ? 'text-midnight-cherry' : 'text-obsidian-roast'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/menu"
              className="hidden md:flex btn-cherry chrome-hover px-5 py-2.5 text-sm font-heading items-center gap-2"
            >
              Order Now
            </Link>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 bg-midnight-cherry text-white rounded-full hover:bg-red-800 transition-colors"
            >
              <ShoppingBag size={18} />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-patina-mint text-white text-xs font-heading w-5 h-5 rounded-full flex items-center justify-center animate-float-up">
                  {totalItems}
                </span>
              )}
            </button>
            <button
              className="md:hidden p-2 text-obsidian-roast"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-border px-4 py-4 flex flex-col gap-4">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className="font-body font-semibold text-obsidian-roast hover:text-midnight-cherry transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              to="/menu"
              onClick={() => setMobileOpen(false)}
              className="btn-cherry chrome-hover px-5 py-3 text-center text-sm font-heading"
            >
              Order Now
            </Link>
          </div>
        )}
      </nav>
    </>
  );
}