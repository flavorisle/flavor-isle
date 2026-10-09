import { todayStr, HUNT_END_DATE } from '@/lib/findSmashie';

// The Halloween look runs site-wide through the last day of the Find Smashie
// hunt (November 1). From November 2 (store-local time) the regular Flavor
// Isle theme comes back on its own — nothing to switch off.
export const HALLOWEEN_THEME_START = '2026-10-01';
export const HALLOWEEN_THEME_END = HUNT_END_DATE;

export function isHalloweenSeason(now = new Date()) {
  const today = todayStr(now);
  return today >= HALLOWEEN_THEME_START && today <= HALLOWEEN_THEME_END;
}