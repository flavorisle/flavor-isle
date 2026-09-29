import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function ShakeFavoriteTile({ rank }) {
  return <Link to="/milkshakes" className="relative flex flex-col justify-between h-full min-h-52 overflow-hidden rounded-2xl bg-obsidian-roast p-5 shadow-float text-white">
    <span aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 90% 15%, rgba(78,227,200,0.18), transparent 55%)' }} />
    {rank <= 3 && <span className="absolute top-2 left-2 z-10 rounded-full bg-smashie-yellow text-obsidian-roast text-xs font-heading w-7 h-7 flex items-center justify-center">{rank}</span>}
    <span className="relative text-4xl mt-5" aria-hidden="true">🥤</span>
    <div className="relative"><h3 className="font-heading text-2xl">Shake Isle — 22 Flavors</h3>
      <span className="btn-cherry inline-flex items-center gap-2 px-4 py-2.5 mt-4 text-sm">Order Shakes <ArrowRight size={14} /></span>
    </div>
  </Link>;
}