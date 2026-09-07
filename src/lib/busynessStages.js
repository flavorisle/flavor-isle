// Kitchen-capacity busyness model — shared frontend stage definitions.
// The level is driven by the rolling 60-minute order count (throughput).
// A sustained rush keeps the momentary 20-min queue small because the
// kitchen cooks at full capacity, so queue depth alone under-reports
// "busy." Throughput over the last hour captures the real load and the
// backlog that builds when orders/hour exceed the ~6–9/hr cook capacity.

export const BUSYNESS_STAGES = [
  { min: 16, level: 'Slammed',        waitRange: '45+ min',  waitMin: 50, bgClass: 'bg-red-100',    textClass: 'text-red-700',    icon: 'Flame',       urgency: "🔥 We're slammed — expect an extended wait before your order is started." },
  { min: 10, level: 'Busy',           waitRange: '30–45 min', waitMin: 38, bgClass: 'bg-orange-100', textClass: 'text-orange-700', icon: 'TrendingUp',  urgency: '⏱ Busy right now — expect a longer wait.' },
  { min: 5,  level: 'A Little Busy',   waitRange: '20–30 min', waitMin: 25, bgClass: 'bg-yellow-100', textClass: 'text-yellow-700', icon: 'AlertCircle', urgency: '⏱ A little busy — expect a short wait.' },
  { min: 0,  level: 'Running Smooth',  waitRange: '~14 min',   waitMin: 14, bgClass: 'bg-green-100',  textClass: 'text-green-700',   icon: 'Zap',         urgency: '' },
];

export function getBusynessStage(count) {
  return BUSYNESS_STAGES.find(s => count >= s.min) || BUSYNESS_STAGES[BUSYNESS_STAGES.length - 1];
}

export const COOK_WINDOW_MINUTES = 10;