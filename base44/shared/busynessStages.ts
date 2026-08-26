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
  mode: string;
}

// The 5 Smashie modes customers see. Four are stages driven by the rolling
// 60-min throughput; the 5th (Melt) is the Recovering state — the wait is
// easing back toward the baseline after a rush. The backend resolves which
// mode to emit per poll so every surface reads one source of truth.
export const BUSYNESS_STAGES: BusynessStage[] = [
  { min: 16, level: 'Slammed',         waitRange: '50–60 min', waitMin: 55, color: 'red',    mode: 'full-smash' },
  { min: 10, level: 'Busy',            waitRange: '35–40 min', waitMin: 38, color: 'orange', mode: 'flex' },
  { min: 5,  level: 'A Little Busy',   waitRange: '~30 min',   waitMin: 30, color: 'yellow', mode: 'steady' },
  { min: 0,  level: 'Running Smooth',  waitRange: '~20 min',   waitMin: 20, color: 'green',  mode: 'chill' },
];

// 5th mode — Recovering (Melt). Not a throughput stage; emitted when the
// regressed wait has dropped below the stage wait while a backlog clears.
export const RECOVERING_MODE = 'melt';
export const RECOVERING_COLOR = 'blue';
// Store-closed mode.
export const CLOSED_MODE = 'closed';
export const CLOSED_COLOR = 'gray';

export function getBusynessStage(rollingCount: number): BusynessStage {
  return BUSYNESS_STAGES.find(s => rollingCount >= s.min) || BUSYNESS_STAGES[BUSYNESS_STAGES.length - 1];
}

// Cook time in minutes — orders older than this have been served and no
// longer contribute to the active queue / busyness level.
export const COOK_WINDOW_MINUTES = 20;

// ── Wait regression constants ──
// Cook capacity: orders/hour the kitchen handles at baseline before a
// backlog builds. When recent inflow falls below this, the wait estimate
// regresses toward the normal floor.
export const COOK_CAPACITY_PER_HOUR = 8;
// Short inflow window (minutes) used to detect a slowdown. Midpoint of the
// 15–20 min range: long enough to smooth a single quiet stretch, short
// enough to catch a real slowdown within a few polls.
export const RECENT_WINDOW_MINUTES = 18;
// Normal (no-backlog) ticket time — the floor the estimate regresses to.
export const BASE_WAIT_MIN = 20;
// Minutes of cook effort each order still in the active queue adds to the
// floor, so a real remaining backlog is still quoted honestly.
export const PER_ORDER_MINUTES = 3;

export interface RegressedWait {
  waitMin: number;
  waitRange: string;
  recovering: boolean;
}

// Regress the estimated wait toward the normal baseline when recent inflow
// falls below cook capacity. Stateless per poll: the estimate interpolates
// between the stage wait (sustained 60-min load) and the baseline, weighted
// by how much of that load is still arriving vs stale from an earlier rush.
// As the recent window rolls and inflow stays low, the freshness ratio
// ramps down and the estimate eases back to the floor over several polls.
// Never drops below the active-queue floor or above the stage wait, so a
// real remaining backlog is still quoted and a fresh rush is never under-reported.
export function computeRegressedWait(
  liveCount: number,
  recentInflow: number,
  activeCount: number,
  stage: BusynessStage
): RegressedWait {
  const stageWait = stage.waitMin;
  const baseFloor = BASE_WAIT_MIN;
  const queueFloor = Math.max(baseFloor, activeCount * PER_ORDER_MINUTES);

  // Expected recent orders if the 60-min rate were sustained into the window.
  const expectedRecent = Math.max(1, liveCount * (RECENT_WINDOW_MINUTES / 60));
  // 1 = recent inflow matches the 60-min rate (sustained) → no decay.
  // 0 = inflow stopped, the 60-min load is stale → decay to the floor.
  const freshness = Math.max(0, Math.min(1, recentInflow / expectedRecent));

  const headroom = Math.max(0, stageWait - baseFloor);
  let waitMin = Math.round(baseFloor + headroom * freshness);
  waitMin = Math.max(waitMin, queueFloor);
  waitMin = Math.min(waitMin, stageWait);
  waitMin = Math.max(waitMin, baseFloor);

  const recovering = waitMin < stageWait && stageWait > baseFloor;
  return { waitMin, waitRange: `≈ ${waitMin} min`, recovering };
}