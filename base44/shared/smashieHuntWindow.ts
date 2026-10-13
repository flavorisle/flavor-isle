// Server mirror of the Find Smashie game window in src/lib/findSmashie.js.
//
// The window is locked for this season: the hunt opens October 15 and November 1
// is the last hunt day, both inclusive, store local time (America/Chicago). It
// lives in code rather than in the saved settings record, so the game always
// starts and stops on the right days — an older record holding a different date
// range can no longer open the hunt early or cut it short.

export const HUNT_START_DATE = '2026-10-15';
export const HUNT_END_DATE = '2026-11-01';

/** Is this YYYY-MM-DD one of the hunt's days? */
export function inHuntWindow(dateStr: string): boolean {
  return dateStr >= HUNT_START_DATE && dateStr <= HUNT_END_DATE;
}