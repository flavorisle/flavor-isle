import React from 'react';
import { ExternalLink } from 'lucide-react';
import { issue23Photos } from '@/lib/issue23Photos';
import { ZONES } from '@/components/pickup/pickupZones';

export default function PickupParkingPhoto({ selectedZone, onSelectZone }) {
  const Marker = onSelectZone ? 'button' : 'span';
  return (
    <figure>
      <div className="relative max-w-3xl mx-auto">
        <a href={issue23Photos.parking} target="_blank" rel="noopener noreferrer" aria-label="Open full-size Flavor Isle parking map">
          <img src={issue23Photos.parking} alt="Flavor Isle at N Main St and 1st St. Blue P markers indicate allowed parking; red crossed-out P markers indicate prohibited parking. Curbside zone locations are labeled A through D." loading="lazy" className="block w-full h-auto" />
        </a>
        {ZONES.map(zone => (
          <Marker key={zone.id} {...(onSelectZone ? { type: 'button', onClick: () => onSelectZone(zone.id), 'aria-pressed': selectedZone === zone.id } : {})}
            aria-label={zone.label} style={{ top: zone.pos.top, left: zone.pos.left }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] rounded-full border-2 border-primary-foreground flex items-center justify-center font-heading text-lg shadow-float ${selectedZone === zone.id ? 'bg-primary text-primary-foreground ring-2 ring-ring ring-offset-2' : 'bg-secondary text-secondary-foreground'}`}>
            {zone.letter}
          </Marker>
        ))}
      </div>
      <figcaption className="p-3 text-center">
        <a href={issue23Photos.parking} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 min-h-[44px] text-sm text-primary underline">
          <ExternalLink size={16} aria-hidden="true" /> Open full-size parking map
        </a>
      </figcaption>
    </figure>
  );
}