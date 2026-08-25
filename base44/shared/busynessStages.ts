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
  { min: 16, level: 'Slammed',         waitRange: '50–60 min', waitMin: 55, color: 'red' },
  { min: 10, level: 'Busy',            waitRange: '35–40 min', waitMin: 38, color: 'orange' },
  { min: 5,  level: 'A Little Busy',   waitRange: '~30 min',   waitMin: 30, color: 'yellow' },
  { min: 0,  level: 'Running Smooth',  waitRange: '~20 min',   waitMin: 20, color: 'green' },
];

export function getBusynessStage(rollingCount: number): BusynessStage {
  return BUSYNESS_STAGES.find(s => rollingCount >= s.min) || BUSYNESS_STAGES[BUSYNESS_STAGES.length - 1];
}

// Cook time in minutes — orders older than this have been served and no
// longer contribute to the active queue / busyness level.
export const COOK_WINDOW_MINUTES = 20;