// Kitchen-capacity busyness model — shared frontend stage definitions.
// The kitchen cooks 2-3 orders at a time with a ~20 min cook time.
// Stages reflect the active queue depth and how long it takes to clear.

export const BUSYNESS_STAGES = [
  { min: 13, level: 'Slammed',        waitRange: '50–60 min', waitMin: 55, bgClass: 'bg-red-100',    textClass: 'text-red-700',    icon: 'Flame',       urgency: "🔥 We're slammed — expect up to a 60 min wait before your order is started." },
  { min: 8,  level: 'Busy',           waitRange: '35–40 min', waitMin: 38, bgClass: 'bg-orange-100', textClass: 'text-orange-700', icon: 'TrendingUp',  urgency: '⏱ Busy right now — expect a 35–40 min wait.' },
  { min: 4,  level: 'A Little Busy',   waitRange: '~30 min',   waitMin: 30, bgClass: 'bg-yellow-100', textClass: 'text-yellow-700', icon: 'AlertCircle', urgency: '⏱ A little busy — expect about a 30 min wait.' },
  { min: 0,  level: 'Running Smooth',  waitRange: '~20 min',   waitMin: 20, bgClass: 'bg-green-100',  textClass: 'text-green-700',   icon: 'Zap',         urgency: '' },
];

export function getBusynessStage(count) {
  return BUSYNESS_STAGES.find(s => count >= s.min) || BUSYNESS_STAGES[BUSYNESS_STAGES.length - 1];
}

export const COOK_WINDOW_MINUTES = 20;