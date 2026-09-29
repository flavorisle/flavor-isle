import React from 'react';
const stats = [
  ['3.4M', 'Burgers served'], ['1.8M', 'Shakes spun & still swirling'],
  ['100%', 'Fresh, never-frozen beef'], ['0', 'Shortcuts. Ever.'],
];
export default function HomeStats() {
  return <section aria-label="Flavor Isle by the numbers" className="bg-patina-mint text-white px-4 py-12">
    <div className="max-w-4xl mx-auto grid grid-cols-2 gap-8">
      {stats.map(([num, label]) => <div key={label} className="text-center">
        <p className="font-heading text-5xl text-smashie-yellow">{num}</p>
        <p className="text-sm uppercase tracking-wide">{label}</p>
      </div>)}
    </div>
  </section>;
}