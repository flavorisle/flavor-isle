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

function StatColumn({ stats }) {
  return <div className="flex flex-col gap-5 text-center">
    {stats.map(({ num, label }) => <div key={label}>
      <div className="font-heading text-5xl lg:text-6xl leading-none mb-1" style={{ color: '#E3481C' }}>{num}</div>
      <div className="text-xs sm:text-sm uppercase tracking-widest text-white/80 font-body">{label}</div>
    </div>)}
  </div>;
}

export default function HeroStats() {
  return <div style={{ background: '#0B355A' }}>
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6 lg:gap-8">
      <StatColumn stats={LEFT} />
      <div className="w-full md:w-[340px] lg:w-[410px]"><PopularTimesCard embedded /></div>
      <StatColumn stats={RIGHT} />
    </div>
  </div>;
}