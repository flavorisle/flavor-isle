// Kitchen-capacity busyness model — shared frontend stage definitions.
// The level is driven by the number of orders that landed in the kitchen over
// a rolling window (held for 8 minutes), not by the momentary queue depth.

export const BUSYNESS_STAGES = [
  { min: 8, level: 'Slammed',        waitRange: '45+ min',  waitMin: 50, bgClass: 'bg-red-100',    textClass: 'text-red-700',    icon: 'Flame',       urgency: "🔥 We're slammed — expect an extended wait before your order is started." },
  { min: 5, level: 'Busy',           waitRange: '30–45 min', waitMin: 38, bgClass: 'bg-orange-100', textClass: 'text-orange-700', icon: 'TrendingUp',  urgency: '⏱ Busy right now — expect a longer wait.' },
  { min: 3, level: 'A Little Busy',   waitRange: '20–30 min', waitMin: 25, bgClass: 'bg-yellow-100', textClass: 'text-yellow-700', icon: 'AlertCircle', urgency: '⏱ A little busy — expect a short wait.' },
  { min: 0, level: 'Running Smooth',  waitRange: '~14 min',   waitMin: 14, bgClass: 'bg-green-100',  textClass: 'text-green-700',   icon: 'Zap',         urgency: '' },
];

export function getBusynessStage(count) {
  return BUSYNESS_STAGES.find(s => count >= s.min) || BUSYNESS_STAGES[BUSYNESS_STAGES.length - 1];
}