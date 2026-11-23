// Kitchen-capacity busyness model.
// The level is driven by the number of orders that landed in the kitchen over a
// rolling window, held for LEVEL_HOLD_MINUTES so a single quiet minute cannot
// drop the level while a rush is still working through.

export interface BusynessStage {
  min: number;
  level: string;
  waitRange: string;
  waitMin: number;
  color: string;
}

export const BUSYNESS_STAGES: BusynessStage[] = [
  { min: 8, level: 'Slammed',         waitRange: '45+ min',  waitMin: 50, color: 'red' },
  { min: 5, level: 'Busy',            waitRange: '30–45 min', waitMin: 38, color: 'orange' },
  { min: 3, level: 'A Little Busy',   waitRange: '20–30 min', waitMin: 25, color: 'yellow' },
  { min: 0, level: 'Running Smooth',  waitRange: '~14 min',   waitMin: 14, color: 'green' },
];

export function getBusynessStage(rollingCount: number): BusynessStage {
  return BUSYNESS_STAGES.find(s => rollingCount >= s.min) || BUSYNESS_STAGES[BUSYNESS_STAGES.length - 1];
}

// Throughput window (minutes) used to set the busyness LEVEL.
export const THROUGHPUT_WINDOW_MINUTES = 30;

// How long the level holds: once the count crosses a threshold the level rises
// at once, and it can only fall after the count has stayed under it for this
// many straight minutes.
export const LEVEL_HOLD_MINUTES = 8;

// Cook time in minutes — orders older than this have been served and no
// longer contribute to the active queue / busyness level.
export const COOK_WINDOW_MINUTES = 10;

export const RUNNING_SMOOTH_STAGE = BUSYNESS_STAGES[BUSYNESS_STAGES.length - 1];

// ── Wait regression constants ──
// Cook capacity: orders/hour the kitchen handles at baseline before a
// backlog builds. When recent inflow falls below this, the wait estimate
// regresses toward the normal floor.
export const COOK_CAPACITY_PER_HOUR = 8;
// Short inflow window (minutes) used to detect a slowdown.
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
// entirely by the active queue depth, so it moves fluidly as orders enter and
// leave the kitchen instead of snapping between fixed stage values.
//
//   wait = BASE_WAIT_MIN + activeCount × PER_ORDER_MINUTES
//
// An empty board quotes the base cook time (~14 min). The busyness LEVEL
// (Running Smooth → Slammed) still comes from the held throughput count and
// drives the color/label/urgency — it just no longer caps the number.
export function computeRegressedWait(
  liveCount: number,
  recentInflow: number,
  activeCount: number,
  stage: BusynessStage
): RegressedWait {
  const queue = Math.max(0, activeCount);
  let waitMin = Math.round(BASE_WAIT_MIN + queue * PER_ORDER_MINUTES);

  // Recovering: recent inflow has dropped below cook capacity while a
  // backlog is still clearing → the wait will ease back down over the next
  // few polls as orders leave the queue.
  const recovering = recentInflow < COOK_CAPACITY_PER_HOUR && queue > 0;

  waitMin = Math.max(waitMin, BASE_WAIT_MIN);
  return { waitMin, waitRange: `≈ ${waitMin} min`, recovering };
}