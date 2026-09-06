import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Instagram, Facebook, Twitter } from 'lucide-react';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursGroups } from '@/lib/businessHours';
import FooterSmsOptIn from '@/components/FooterSmsOptIn';

export default function Footer() {
  const businessHours = useBusinessHours();
  return (
    <footer className="bg-obsidian-roast text-white">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="md:col-span-1">
          <img
            src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7b759012a_FlavorIsleBuilding.png"
            alt="Flavor Isle roadside stand — Smiths Grove, KY, Est. 1964"
            className="w-full max-w-[260px] object-contain mb-4"
          />
          <p className="text-gray-300 text-sm leading-relaxed">
            Smiths Grove's favorite burger restaurant. Fresh, never-frozen burgers, thick shakes, and hot sides.
          </p>
          <div className="flex gap-3 mt-5">
            <a href="https://instagram.com/flavor_isle" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-patina-mint transition-colors">
              <Instagram size={16} />
            </a>
            <a href="https://facebook.com/flavorisle" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-patina-mint transition-colors">
              <Facebook size={16} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-patina-mint transition-colors">
              <Twitter size={16} />
            </a>
          </div>
        </div>

        {/* Hours */}
        <div>
          <h4 className="font-heading text-sm uppercase tracking-widest mb-4 text-[hsl(var(--primary))]">HOURS</h4>
          <div className="space-y-2 text-sm text-gray-300">
            {hoursGroups(businessHours).map((g) =>
            <div key={g.days} className="flex justify-between gap-4">
                <span>{g.days}</span>
                <span>{g.label}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="font-heading text-sm uppercase tracking-widest mb-4 text-[hsl(var(--primary))]">QUICK LINKS</h4>
          <div className="flex flex-col gap-2 text-sm text-gray-300">
            <Link to="/menu" className="hover:text-white transition-colors">Order Online</Link>
            <Link to="/merch" className="hover:text-white transition-colors">Tasty Threads</Link>
            <Link to="/about" className="hover:text-white transition-colors">About Us</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link>
            <Link to="/what-to-expect" className="hover:text-white transition-colors">What to Expect</Link>
            <Link to="/feedback" className="hover:text-white transition-colors">Share Feedback</Link>
            <Link to="/account" className="hover:text-white transition-colors">My Account</Link>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-heading text-sm uppercase tracking-widest mb-4 text-[hsl(var(--primary))]">FIND US</h4>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 flex-shrink-0 text-[hsl(var(--primary))]" />
              <a href="https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">103 N Main St, Smiths Grove<br />Kentucky, KY 42171</a>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} className="flex-shrink-0 text-[hsl(var(--primary))]" />
              <a href="tel:+12705634618" className="hover:text-white transition-colors">(270) 563-4618</a>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="flex-shrink-0 text-[hsl(var(--primary))]" />
              <span>Kitchen closes 30 min before closing</span>
            </div>
          </div>
        </div>
      </div>

      {/* SMS opt-in + A2P disclosure */}
      <FooterSmsOptIn />

      {/* Bottom bar */}
      <div className="border-t border-white/10 px-4 sm:px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <span className="text-[hsl(var(--primary))]">© 2026 Flavor Isle. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>);

}