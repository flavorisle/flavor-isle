// Kitchen-capacity busyness model.
// The level is driven by the rolling 60-minute order count (throughput) rather
// than the instantaneous 20-min queue depth. A sustained rush keeps the
// momentary queue small because the kitchen is cooking at full capacity, so
// queue depth alone under-reports "busy." Throughput over the last hour
// captures the real load: when orders/hour exceed the kitchen's ~6–9/hr
// cook capacity, a backlog builds and the wait grows.

export interface BusynessStage {
  min: number;
  level: string;
  waitRange: string;
  waitMin: number;
  color: string;
}

export const BUSYNESS_STAGES: BusynessStage[] = [
  { min: 30, level: 'Slammed',         waitRange: '45+ min',  waitMin: 50, color: 'red' },
  { min: 22, level: 'Busy',            waitRange: '30–45 min', waitMin: 38, color: 'orange' },
  { min: 14, level: 'A Little Busy',   waitRange: '20–30 min', waitMin: 25, color: 'yellow' },
  { min: 0,  level: 'Running Smooth',  waitRange: '~14 min',   waitMin: 14, color: 'green' },
];

// speedFactor scales kitchen capacity (2 = an extra cook working, orders
// complete twice as fast) — thresholds stretch so it takes proportionally
// more orders to reach each busyness stage.
export function getBusynessStage(rollingCount: number, speedFactor = 1): BusynessStage {
  return BUSYNESS_STAGES.find(s => rollingCount >= s.min * speedFactor) || BUSYNESS_STAGES[BUSYNESS_STAGES.length - 1];
}

// Cook time in minutes — orders older than this have been served and no
// longer contribute to the active queue / busyness level.
export const COOK_WINDOW_MINUTES = 20;

// Quiet-kitchen reset: once this many minutes pass with no new order coming
// in, the board is considered cleared — the crew has caught up, so the status
// drops straight back to Running Smooth with the base cook time instead of
// riding the last hour's throughput.
export const QUIET_WINDOW_MINUTES = 10;

export const RUNNING_SMOOTH_STAGE = BUSYNESS_STAGES[BUSYNESS_STAGES.length - 1];

// ── Wait regression constants ──
// Cook capacity: orders/hour the kitchen handles at baseline before a
// backlog builds. When recent inflow falls below this, the wait estimate
// regresses toward the normal floor.
export const COOK_CAPACITY_PER_HOUR = 8;
// Short inflow window (minutes) used to detect a slowdown. Midpoint of the
// 15–20 min range: long enough to smooth a single quiet stretch, short
// enough to catch a real slowdown within a few polls.
export const RECENT_WINDOW_MINUTES = 18;
// Normal (no-backlog) ticket time — the base cook time for a single order
// with an empty board. The live wait starts here and grows with the queue.
export const BASE_WAIT_MIN = 14;
// Minutes of cook effort each order still in the active queue adds to the
// base, so the estimate moves fluidly as orders enter and leave the kitchen.
export const PER_ORDER_MINUTES = 3;

export interface RegressedWait {
  waitMin: number;
  waitRange: string;
  recovering: boolean;
}

// Continuous wait estimate — no stage-bucketed ceiling. The number is driven
// entirely by the active queue depth (orders placed in the last cook window
// that are still being worked), so it moves fluidly as orders enter and leave
// the kitchen instead of snapping between fixed stage values (20 → 30 → 38).
//
//   wait = BASE_COOK_TIME + activeCount × PER_ORDER_MINUTES
//
// An empty board quotes the base cook time (~14 min). Each order in the
// active queue adds a few minutes. The busyness LEVEL (Running Smooth →
// Slammed) still comes from the rolling 60-min throughput and drives the
// color/label/urgency — it just no longer caps the number.
// speedFactor: kitchen speed multiplier (2 = extra cook, queue clears twice
// as fast so each queued order adds half the minutes; base single-order cook
// time is unchanged — one burger doesn't grill faster with a second cook).
export function computeRegressedWait(
  liveCount: number,
  recentInflow: number,
  activeCount: number,
  stage: BusynessStage,
  speedFactor = 1
): RegressedWait {
  const queue = Math.max(0, activeCount);
  let waitMin = Math.round(BASE_WAIT_MIN + (queue * PER_ORDER_MINUTES) / speedFactor);

  // Recovering: recent inflow has dropped below cook capacity while a
  // backlog is still clearing → the wait will ease back down over the next
  // few polls as orders leave the cook window.
  const recovering = recentInflow < COOK_CAPACITY_PER_HOUR * speedFactor && queue > 0;

  waitMin = Math.max(waitMin, BASE_WAIT_MIN);
  return { waitMin, waitRange: `≈ ${waitMin} min`, recovering };
}