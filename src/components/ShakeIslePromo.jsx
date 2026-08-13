import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

// Promotional section on the Menu page that funnels customers to the
// dedicated Shake Isle experience (/milkshakes) instead of listing individual
// shake items. Shake items are hidden from the main menu and managed entirely
// through the ShakeCustomizer on the Shake Isle page.
export default function ShakeIslePromo() {
  return (
    <Link
      to="/milkshakes"
      className="block relative overflow-hidden rounded-3xl bg-obsidian-roast group"
    >
      {/* Glow background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 12% 50%, rgba(204,51,0,0.35) 0%, transparent 45%), radial-gradient(circle at 88% 30%, rgba(0,51,102,0.45) 0%, transparent 50%)',
        }}
      />
      <div className="relative z-10 flex items-center gap-5 p-6 sm:p-8">
        {/* Emoji stack */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-heading uppercase tracking-widest mb-1" style={{ color: '#4EE3C8' }}>
            Hand-Spun Shakes
          </p>
          <p className="text-gray-300 text-xs mb-3">
            Pick from 16 original shakes, 5 premium ones, or create your own.
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl text-white leading-none mb-2">
            SHAKE ISLE
          </h2>
          <p className="text-gray-300 text-sm">
            Pick your size, the flavor, &amp; ice cream base. Then twist it your way with another flavor — cold, creamy, and built to stunt.
          </p>
        </div>
        <div className="hidden sm:flex flex-shrink-0 items-center gap-1">
          <span className="text-5xl">🥤</span>
          <span className="text-4xl -ml-3">🍦</span>
        </div>
        <div className="flex-shrink-0">
          <span className="inline-flex items-center gap-2 bg-smashie-yellow text-obsidian-roast font-heading rounded-full px-6 py-3 text-sm group-hover:gap-3 transition-all">
            Explore <ArrowRight size={16} />
          </span>
        </div>
      </div>
    </Link>
  );
}