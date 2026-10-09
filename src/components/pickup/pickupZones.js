// Curbside zones for the revised parking map (issue #85).
// A, B and C only — the old fourth zone was retired with the old map.
// pos = centre of that zone's letter badge on the map image, as a percentage
// of the map's width/height.
export const ZONES = [
  { id: 'a', letter: 'A', label: 'Zone A — Behind Flavor Isle', description: 'The parking area directly behind Flavor Isle.', pos: { top: '37%', left: '30%' } },
  { id: 'b', letter: 'B', label: 'Zone B — By the Post Office', description: 'Across from the back parking lot, beside the Post Office and behind Psycho Grannies.', pos: { top: '61%', left: '7%' } },
  { id: 'c', letter: 'C', label: 'Zone C — Across N Main St', description: "Across from Flavor Isle in the Oreid Insurance parking lot.", pos: { top: '25%', left: '53%' } },
];