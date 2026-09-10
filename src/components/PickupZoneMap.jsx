import React from 'react';
import { MapPin, Car, Building2, TreePalm, ArrowRight } from 'lucide-react';

// Visual map of Flavor Isle's pickup zones. Shown on the order status page
// so curbside customers know exactly which area to select when they park.
// Each zone has a color-coded pin, label, and short description.

export const ZONES = [
  {
    id: 'front',
    label: 'Zone A — Front Door',
    description: 'Right out front of the main entrance on N Main St.',
    color: '#CC3300',
    icon: Building2,
    // Position on the relative map (percentages)
    pos: { top: '18%', left: '42%' },
  },
  {
    id: 'side',
    label: 'Zone B — Side Lot',
    description: 'Side parking lot on the east side of the building.',
    color: '#003366',
    icon: Car,
    pos: { top: '52%', left: '72%' },
  },
  {
    id: 'back',
    label: 'Zone C — Back Lot',
    description: 'Behind the building — pull around to the rear lot.',
    color: '#F5A623',
    icon: Car,
    pos: { top: '78%', left: '40%' },
  },
  {
    id: 'street',
    label: 'Zone D — Street Parking',
    description: 'Angle parking along N Main St in front of the store.',
    color: '#2D8659',
    icon: TreePalm,
    pos: { top: '38%', left: '12%' },
  },
];

export default function PickupZoneMap({ selectedZone, onSelectZone, compact = false }) {
  return (
    <div className="card-diner overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-midnight-cherry/5">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={18} className="text-midnight-cherry" />
          <h3 className="font-heading text-lg text-obsidian-roast">Pickup Zones</h3>
        </div>
        <p className="text-xs text-muted-foreground font-body">
          Tap a zone to select where you parked. Our crew will bring your order right to your spot.
        </p>
      </div>

      {/* Visual map */}
      <div className="relative bg-gradient-to-br from-[#e8e4d8] to-[#d9d4c4] h-64 sm:h-72">
        {/* Building outline (center) */}
        <div className="absolute top-[30%] left-[35%] w-[30%] h-[40%] bg-white/80 border-2 border-obsidian-roast/40 rounded-lg flex items-center justify-center">
          <div className="text-center px-2">
            <Building2 size={20} className="text-obsidian-roast/60 mx-auto mb-1" />
            <p className="font-heading text-[10px] text-obsidian-roast/70 uppercase tracking-wider">Flavor Isle</p>
          </div>
        </div>

        {/* Street label */}
        <div className="absolute top-[8%] left-[35%] w-[30%] text-center">
          <p className="font-heading text-[9px] text-obsidian-roast/40 uppercase tracking-widest">N Main St</p>
        </div>
        <div className="absolute top-[10%] left-[35%] w-[30%] h-[6%] bg-obsidian-roast/15" />

        {/* Zone pins */}
        {ZONES.map((zone) => {
          const Icon = zone.icon;
          const isSelected = selectedZone === zone.id;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => onSelectZone?.(zone.id)}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group focus:outline-none"
              style={{ top: zone.pos.top, left: zone.pos.left }}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shadow-float transition-all group-hover:scale-110 ${
                  isSelected ? 'ring-4 ring-offset-2 scale-110' : ''
                }`}
                style={{
                  backgroundColor: zone.color,
                  '--tw-ring-color': zone.color,
                }}
              >
                <Icon size={16} className="text-white" />
              </div>
              <span
                className="text-[10px] font-heading uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/90 shadow-sm"
                style={{ color: zone.color }}
              >
                {zone.label.split(' — ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Zone list */}
      <div className="p-4 space-y-2">
        {ZONES.map((zone) => {
          const Icon = zone.icon;
          const isSelected = selectedZone === zone.id;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => onSelectZone?.(zone.id)}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                isSelected
                  ? 'border-midnight-cherry bg-midnight-cherry/5'
                  : 'border-border bg-white hover:border-midnight-cherry/30'
              }`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ backgroundColor: zone.color }}
              >
                <Icon size={15} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm text-obsidian-roast">{zone.label}</p>
                <p className="text-xs text-muted-foreground font-body mt-0.5">{zone.description}</p>
              </div>
              {isSelected && (
                <div className="flex items-center gap-1 text-xs text-midnight-cherry font-heading uppercase tracking-wider flex-shrink-0 mt-1">
                  Selected <ArrowRight size={12} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}