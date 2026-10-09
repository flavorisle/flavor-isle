import React from 'react';

// The parking rules shown alongside the curbside map (issue #85). Held in one
// place so the Contact page zone list, the I-65 Exit 38 page and the Order
// Status zone picker always read exactly the same.
export const PARKING_RULES = [
  'All spots in Zone C are available after 4 PM. Before 4 PM, only the first spot is reserved.',
  'Please do not park on 1st St at all — along the building or along the street.',
  'Parking in front on N Main St must be with the flow of traffic, and please do not touch the sidewalk.',
];

export default function ParkingRules({ className = '' }) {
  return (
    <ul className={`text-xs text-muted-foreground font-body space-y-1 ${className}`}>
      {PARKING_RULES.map((rule) => (
        <li key={rule}>{rule}</li>
      ))}
    </ul>
  );
}