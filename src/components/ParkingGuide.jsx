import React from 'react';
import { Car } from 'lucide-react';
import PickupZoneMap from '@/components/PickupZoneMap';

export default function ParkingGuide() {
  return (
    <section aria-labelledby="parking-heading" className="card-diner overflow-hidden mb-12">
      <div className="p-5 sm:p-7">
        <h2 id="parking-heading" className="font-heading text-2xl sm:text-3xl text-obsidian-roast flex items-center gap-2">
          <Car size={24} aria-hidden="true" /> Where to Park
        </h2>
        <p className="text-sm text-muted-foreground mt-2">Look for the blue P markers along N Main St and in the nearby marked lots. Avoid spots marked with a red crossed-out P.</p>
        <div className="flex flex-wrap gap-2 mt-4" aria-label="Parking map key">
          <span className="inline-flex items-center gap-2 rounded-full bg-patina-mint text-white px-3 py-2 text-sm font-semibold">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-patina-mint font-heading" aria-hidden="true">P</span> Blue P = park here
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-midnight-cherry text-white px-3 py-2 text-sm font-semibold">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-midnight-cherry font-heading line-through" aria-hidden="true">P</span> Red crossed P = no parking
          </span>
        </div>
      </div>
      <PickupZoneMap />
    </section>
  );
}