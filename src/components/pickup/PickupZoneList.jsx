import React from 'react';
import { Check } from 'lucide-react';
import { ZONES } from '@/components/pickup/pickupZones';
import ParkingRules from '@/components/parking/ParkingRules';

export default function PickupZoneList({ selectedZone, onSelectZone }) {
  const Row = onSelectZone ? 'button' : 'div';
  return (
    <div className="p-4 space-y-2">
      {ZONES.map(zone => {
        const selected = selectedZone === zone.id;
        return (
          <Row key={zone.id} {...(onSelectZone ? { type: 'button', onClick: () => onSelectZone(zone.id), 'aria-pressed': selected } : {})}
            className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left ${selected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
            <span className="w-8 h-8 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center flex-shrink-0 font-heading" aria-hidden="true">{zone.letter}</span>
            <div className="flex-1 min-w-0">
              <p className="font-heading text-sm text-foreground">{zone.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{zone.description}</p>
            </div>
            {selected && <Check size={18} className="text-primary flex-shrink-0" aria-hidden="true" />}
          </Row>
        );
      })}
      <ParkingRules />
    </div>
  );
}