import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

export default function Milkshakes() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <section className="relative overflow-hidden bg-obsidian-roast flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center py-24">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 15% 50%, rgba(192,57,43,0.3) 0%, transparent 50%), radial-gradient(circle at 85% 30%, rgba(26,58,92,0.4) 0%, transparent 50%)`
        }} />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-smashie-yellow/20 border border-smashie-yellow/40 text-smashie-yellow px-4 py-2 rounded-full text-xs font-heading uppercase tracking-widest mb-8">
            Coming Soon
          </div>

          <h1 className="font-heading leading-none mb-6">
            <span className="block text-7xl sm:text-9xl text-white">SHAKE</span>
            <span className="block text-7xl sm:text-9xl" style={{ color: '#4EE3C8' }}>ISLE</span>
          </h1>

          <p className="text-gray-300 text-lg mb-3 leading-relaxed">
            The <span className="text-white font-semibold">Build Your Own Shake</span> experience is on its way.
          </p>
          <p className="text-gray-400 text-base mb-12 max-w-xl mx-auto">
            Your rules. Your flavors. Your masterpiece. We're putting the finishing touches on something special — check back soon.
          </p>

          <Link
            to="/menu"
            className="btn-cherry chrome-hover inline-flex items-center gap-3 px-10 py-5 font-heading text-base"
          >
            Browse the Menu <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}