// Server mirror of the Find Smashie game window in src/lib/findSmashie.js.
//
// The official window is October 15 – November 1, both days inclusive, store
// local time (America/Chicago). It is the outer bound of the hunt: whatever an
// older settings record happens to say, the game never opens before October 15
// and never runs past November 1 — so the hunt always starts and stops on the
// right days, and a stale saved date range can't extend or shorten it.

export const HUNT_START_DATE = '2026-10-15';
export const HUNT_END_DATE = '2026-11-01';

/**
 * The saved admin dates clamped to the official window. A blank or inverted
 * pair falls back to the whole official window.
 */
export function resolveHuntWindow(startDate?: string, endDate?: string): { start: string; end: string } {
  const start = startDate && startDate > HUNT_START_DATE ? startDate : HUNT_START_DATE;
  const end = endDate && endDate < HUNT_END_DATE ? endDate : HUNT_END_DATE;
  if (start > end) return { start: HUNT_START_DATE, end: HUNT_END_DATE };
  return { start, end };
}

/** Is this YYYY-MM-DD inside the locked hunt window? */
export function inHuntWindow(dateStr: string, startDate?: string, endDate?: string): boolean {
  const { start, end } = resolveHuntWindow(startDate, endDate);
  return dateStr >= start && dateStr <= end;
}