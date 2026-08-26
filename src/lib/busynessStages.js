// Kitchen-capacity busyness model — shared frontend stage definitions.
// The level is driven by the rolling 60-minute order count (throughput).
// A sustained rush keeps the momentary 20-min queue small because the
// kitchen cooks at full capacity, so queue depth alone under-reports
// "busy." Throughput over the last hour captures the real load and the
// backlog that builds when orders/hour exceed the ~6–9/hr cook capacity.

export const BUSYNESS_STAGES = [
  { min: 16, level: 'Slammed',        waitRange: '50–60 min', waitMin: 55, color: 'red',    mode: 'full-smash', bgClass: 'bg-red-100',    textClass: 'text-red-700',    icon: 'Flame',       urgency: "🔥 We're slammed — expect up to a 60 min wait before your order is started." },
  { min: 10, level: 'Busy',           waitRange: '35–40 min', waitMin: 38, color: 'orange', mode: 'flex',       bgClass: 'bg-orange-100', textClass: 'text-orange-700', icon: 'TrendingUp',  urgency: '⏱ Busy right now — expect a 35–40 min wait.' },
  { min: 5,  level: 'A Little Busy',   waitRange: '~30 min',   waitMin: 30, color: 'yellow', mode: 'steady',     bgClass: 'bg-yellow-100', textClass: 'text-yellow-700', icon: 'AlertCircle', urgency: '⏱ A little busy — expect about a 30 min wait.' },
  { min: 0,  level: 'Running Smooth',  waitRange: '~20 min',   waitMin: 20, color: 'green',  mode: 'chill',      bgClass: 'bg-green-100',  textClass: 'text-green-700',   icon: 'Zap',         urgency: '' },
];

export function getBusynessStage(count) {
  return BUSYNESS_STAGES.find(s => count >= s.min) || BUSYNESS_STAGES[BUSYNESS_STAGES.length - 1];
}

// Smashie-mode + color meta for the "Recovering" state — the wait is easing
// back toward the baseline after a rush. Not a stage; derived in useLiveStatus
// from the backend `recovering` flag.
export const RECOVERING_META = { color: 'blue', icon: 'melt' };
export const CLOSED_META = { color: 'gray', icon: 'closed' };

// Resolve the spec UI data model's `color` + `icon` (Smashie mode) for a level.
export function getStageMeta(levelName) {
  if (levelName === 'Closed') return CLOSED_META;
  const s = BUSYNESS_STAGES.find(s => s.level === levelName);
  return s ? { color: s.color, icon: s.mode } : { color: 'green', icon: 'chill' };
}

export const COOK_WINDOW_MINUTES = 20;