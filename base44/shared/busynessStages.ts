// Kitchen-capacity busyness model.
// The kitchen cooks 2-3 orders at a time with a ~20 min cook time.
// Stages reflect the active queue depth (orders in the last 20 min) and
// how long it takes the cook to clear the backlog at each level.

export interface BusynessStage {
  min: number;
  level: string;
  waitRange: string;
  waitMin: number;
  color: string;
}

export const BUSYNESS_STAGES: BusynessStage[] = [
  { min: 13, level: 'Slammed',         waitRange: '50–60 min', waitMin: 55, color: 'red' },
  { min: 8,  level: 'Busy',            waitRange: '35–40 min', waitMin: 38, color: 'orange' },
  { min: 4,  level: 'A Little Busy',   waitRange: '~30 min',   waitMin: 30, color: 'yellow' },
  { min: 0,  level: 'Running Smooth',  waitRange: '~20 min',   waitMin: 20, color: 'green' },
];

export function getBusynessStage(activeCount: number): BusynessStage {
  return BUSYNESS_STAGES.find(s => activeCount >= s.min) || BUSYNESS_STAGES[BUSYNESS_STAGES.length - 1];
}

// Cook time in minutes — orders older than this have been served and no
// longer contribute to the active queue / busyness level.
export const COOK_WINDOW_MINUTES = 20;