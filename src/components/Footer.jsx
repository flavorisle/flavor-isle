import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Instagram, Facebook, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-obsidian-roast text-white">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-midnight-cherry rounded-full flex items-center justify-center font-heading text-lg">FI</div>
            <div>
              <div className="font-heading text-xl leading-none">FLAVOR ISLE</div>
              <div className="text-xs text-patina-mint tracking-widest">SMITHS GROVE, KY</div>
            </div>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Smiths Grove's favorite classic American diner. Serving up comfort since the very beginning.
          </p>
          <div className="flex gap-3 mt-5">
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-patina-mint transition-colors">
              <Instagram size={16} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-patina-mint transition-colors">
              <Facebook size={16} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-patina-mint transition-colors">
              <Twitter size={16} />
            </a>
          </div>
        </div>

        {/* Hours */}
        <div>
          <h4 className="font-heading text-sm uppercase tracking-widest text-patina-mint mb-4">Hours</h4>
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex justify-between gap-4">
              <span>Monday – Friday</span>
              <span>7AM – 10PM</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Saturday</span>
              <span>8AM – 11PM</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Sunday</span>
              <span>8AM – 9PM</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-heading text-sm uppercase tracking-widest text-patina-mint mb-4">Quick Links</h4>
          <div className="flex flex-col gap-2 text-sm text-gray-400">
            <Link to="/menu" className="hover:text-white transition-colors">Order Online</Link>
            <Link to="/menu" className="hover:text-white transition-colors">Full Menu</Link>
            <Link to="/about" className="hover:text-white transition-colors">Our Story</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-heading text-sm uppercase tracking-widest text-patina-mint mb-4">Find Us</h4>
          <div className="space-y-3 text-sm text-gray-400">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="text-patina-mint mt-0.5 flex-shrink-0" />
              <span>Main Street, Smiths Grove<br />Kentucky, KY 42171</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-patina-mint flex-shrink-0" />
              <a href="tel:+12705635000" className="hover:text-white transition-colors">(270) 563-5000</a>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-patina-mint flex-shrink-0" />
              <span>Kitchen closes 30 min before closing</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10 px-4 sm:px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <span>© 2024 Flavor Isle. All rights reserved. | flavor-isle.com</span>
          <span>Powered by Square & Stripe</span>
        </div>
      </div>
    </footer>
  );
}