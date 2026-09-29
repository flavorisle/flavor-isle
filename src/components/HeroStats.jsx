import React from 'react';
import PopularTimesCard from '@/components/PopularTimesCard';

const LEFT = [
  { num: '3.4M', label: 'BURGERS SERVED' },
  { num: '100%', label: 'FRESH, NEVER-FROZEN BEEF' },
];
const RIGHT = [
  { num: '1.8M', label: 'SHAKES SPUN & STILL SWIRLING' },
  { num: '0', label: 'SHORTCUTS. EVER.' },
];

function Stat({ num, label }) {
  return <div className="text-center">
    <div className="font-heading text-[32px] leading-none mb-1 text-smashie-yellow">{num}</div>
    <div className="text-xs uppercase tracking-wide text-white/80 font-body">{label}</div>
  </div>;
}

export default function HeroStats() {
  return <section aria-label="Flavor Isle by the numbers" className="bg-obsidian-roast">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-2 lg:grid-cols-[1fr_1fr_minmax(300px,1.8fr)_1fr_1fr] items-center gap-4">
      {LEFT.map((stat) => <Stat key={stat.label} {...stat} />)}
      <div className="col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1"><PopularTimesCard embedded /></div>
      {RIGHT.map((stat) => <Stat key={stat.label} {...stat} />)}
    </div>
  </section>;
}