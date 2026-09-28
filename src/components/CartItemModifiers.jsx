import React from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';
import { buildDeluxeLabel } from '@/lib/deluxeLabel';
import { isDeluxeEnabled, getDeluxePresets, presetTrackedToppings } from '@/lib/deluxeConfig';

// Renders the chosen modifiers for a cart/checkout line, with their prices.
// When the selection matches the Deluxe preset, a compact "Deluxe" (or
// "Deluxe, no …") badge is shown above the individual modifier lines.
export default function CartItemModifiers({ modifiers, allergyNote }) {
  const hasMods = Array.isArray(modifiers) && modifiers.length > 0;
  const note = (allergyNote || '').trim();
  if (!hasMods && !note) return null;
  const labelPresets = getDeluxePresets().map((p) => ({
    name: p.name,
    trackedToppings: presetTrackedToppings(p),
  }));
  const deluxeLabel = isDeluxeEnabled() ? buildDeluxeLabel(modifiers || [], labelPresets) : null;
  return (
    <div className="mb-1">
      {deluxeLabel && (
        <div className="inline-flex items-center gap-1 bg-midnight-cherry/10 text-midnight-cherry text-xs font-heading px-2 py-0.5 rounded-full mb-1">
          <Sparkles size={10} />
          {deluxeLabel}
        </div>
      )}
      {hasMods && (
        <ul className="text-xs text-patina-mint space-y-0.5">
          {modifiers.filter(m => m.name && !m.silent).map((m, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-patina-mint opacity-50">+</span>
              <span className="leading-snug">
                {m.name}
                {m.price > 0 && (
                  <span className="ml-1 opacity-70">+${m.price.toFixed(2)}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {note && (
        <p className="inline-flex items-start gap-1 bg-midnight-cherry/10 text-midnight-cherry text-xs font-semibold px-2 py-1 rounded-lg mt-1">
          <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />
          Allergy on this item: {note}
        </p>
      )}
    </div>
  );
}