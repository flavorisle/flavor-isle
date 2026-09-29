import React from 'react';
import { MapPin } from 'lucide-react';
import PickupParkingPhoto from '@/components/pickup/PickupParkingPhoto';
import PickupZoneList from '@/components/pickup/PickupZoneList';
export { ZONES } from '@/components/pickup/pickupZones';

export default function PickupZoneMap({ selectedZone, onSelectZone }) {
  return (
    <div className="card-diner overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-primary/5">
        <h3 className="font-heading text-lg text-foreground flex items-center gap-2">
          <MapPin size={18} className="text-primary" aria-hidden="true" /> Curbside Pickup Zones
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {onSelectZone ? 'Tap a letter or zone below to tell the crew where you parked.' : 'Find your curbside zone below, then select it on your Order Status page when you arrive.'}
          {' '}Park only at blue P markers. No parking at red crossed-out markers or along the restaurant’s 1st St frontage.
        </p>
      </div>
      <PickupParkingPhoto selectedZone={selectedZone} onSelectZone={onSelectZone} />
      <PickupZoneList selectedZone={selectedZone} onSelectZone={onSelectZone} />
    </div>
  );
}