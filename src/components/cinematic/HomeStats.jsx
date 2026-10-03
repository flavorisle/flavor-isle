import React from 'react';
const stats = {
  left: [['3.4M', 'Burgers served'], ['100%', 'Fresh, never-frozen beef']],
  right: [['1.8M', 'Shakes spun & still swirling'], ['0', 'Shortcuts. Ever.']],
};
export default function HomeStats({ side }) {
  return <div className="contents" aria-label="Flavor Isle by the numbers">
    {stats[side].map(([num, label]) => <div key={label} className="flex h-8 flex-shrink-0 items-center gap-1.5">
      <span className="font-heading text-xl text-smashie-yellow">{num}</span>
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
    </div>)}
  </div>;
}