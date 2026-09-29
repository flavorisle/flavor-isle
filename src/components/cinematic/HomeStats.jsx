import React from 'react';
const stats = {
  left: [['3.4M', 'Burgers served'], ['100%', 'Fresh, never-frozen beef']],
  right: [['1.8M', 'Shakes spun & still swirling'], ['0', 'Shortcuts. Ever.']],
};
export default function HomeStats({ side }) {
  return <div className="flex flex-col justify-around gap-6 text-center" aria-label="Flavor Isle by the numbers">
    {stats[side].map(([num, label]) => <div key={label}>
      <p className="font-heading text-5xl text-smashie-yellow">{num}</p>
      <p className="text-sm uppercase tracking-wide">{label}</p>
    </div>)}
  </div>;
}