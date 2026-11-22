import React from 'react';
import PopularTimesCard from '@/components/PopularTimesCard';

// Issue #345, item 2 — the order-type pill row above the busyness chart is gone;
// the chart is all this block shows now. Item 3 tightened the navy panel around
// it.
export default function HomeOrderOptions({ embedded = false }) {
  const controls = (
    <div className="rounded-2xl bg-[#1A3A5C] px-2.5 py-2.5 text-white">
      <div className="max-w-[22rem] mx-auto">
        <PopularTimesCard embedded />
      </div>
    </div>
  );

  // Embedded: the controls sit inside the dining-room photo chapter on the home
  // page instead of a navy band of their own.
  if (embedded) {
    return <div aria-label="How busy are we?">{controls}</div>;
  }

  return (
    <section className="bg-patina-mint text-white px-4 py-10 sm:py-14" aria-label="How busy are we?">
      <div className="max-w-6xl mx-auto">
        {controls}
      </div>
    </section>
  );
}