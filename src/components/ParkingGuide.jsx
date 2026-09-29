import React from 'react';
import { Car, ExternalLink } from 'lucide-react';
import { issue23Photos } from '@/lib/issue23Photos';

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
      <figure>
        <a href={issue23Photos.parking} target="_blank" rel="noopener noreferrer" aria-label="Open full-size Flavor Isle parking map in a new tab" className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-midnight-cherry">
          <img src={issue23Photos.parking} alt="Flavor Isle parking map: blue P markers show available spaces along N Main St and nearby lots; red crossed-out P markers show where parking is prohibited" loading="lazy" className="block w-full max-w-3xl mx-auto h-auto" />
        </a>
        <figcaption className="p-4 text-center text-sm text-patina-mint font-semibold inline-flex items-center justify-center gap-2 w-full">
          <ExternalLink size={16} aria-hidden="true" /> Tap the map to open it full size
        </figcaption>
      </figure>
    </section>
  );
}