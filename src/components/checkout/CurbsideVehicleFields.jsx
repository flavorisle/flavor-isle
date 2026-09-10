import React from 'react';
import { Car } from 'lucide-react';

// Curbside checkout — collect the customer's vehicle up front so the crew
// knows what car to look for before they even arrive.
export default function CurbsideVehicleFields({ vehicle, onChange, errors = {} }) {
  const update = (field, val) => onChange({ ...vehicle, [field]: val });

  const inputClass = (err) =>
    `w-full px-3 py-2.5 bg-muted border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry ${err ? 'border-destructive' : 'border-border'}`;

  return (
    <div className="mt-4 rounded-2xl border-2 border-midnight-cherry/20 bg-midnight-cherry/5 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Car size={16} className="text-midnight-cherry" />
        <h3 className="font-heading text-sm text-obsidian-roast uppercase tracking-wider">Your Vehicle</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">We'll bring your order right to your car — tell us what to look for.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Color *</label>
          <input type="text" value={vehicle.color} onChange={e => update('color', e.target.value)} placeholder="Red" className={inputClass(errors.carColor)} />
          {errors.carColor && <p className="text-xs text-destructive mt-1">{errors.carColor}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Make *</label>
          <input type="text" value={vehicle.make} onChange={e => update('make', e.target.value)} placeholder="Chevy" className={inputClass(errors.carMake)} />
          {errors.carMake && <p className="text-xs text-destructive mt-1">{errors.carMake}</p>}
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Model</label>
          <input type="text" value={vehicle.model} onChange={e => update('model', e.target.value)} placeholder="Silverado" className={inputClass(false)} />
        </div>
      </div>
    </div>
  );
}