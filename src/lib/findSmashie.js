// ─────────────────────────────────────────────────────────────
// Find Smashie — Halloween Hide & Seek (October game)
//
// Every day Smashie hides somewhere on the site. Pumpkin Smashie
// hides from open until 5:00 PM; if nobody has found him by 5 PM,
// he moves to a NEW hiding spot as Vampire Smashie until close.
// First signed-in player to click him wins their choice of
// 100 Star Rewards points or an instant free milkshake.
// ─────────────────────────────────────────────────────────────

export const HUNT_START_DATE = '2026-10-01';
export const HUNT_END_DATE = '2026-10-31';
export const VAMPIRE_SWITCH_TIME = '17:00'; // 5:00 PM store-local
export const INSTAGRAM_HANDLE = '@flavor_isle';
export const INSTAGRAM_URL = 'https://www.instagram.com/flavor_isle/';

// Smashie's Halloween costumes — uploaded art hosted on the app's media CDN.
export const SMASHIE_IMAGES = {
  pumpkin: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/923d1a767_pumpkin.png',
  vampire: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/2c9646fde_vampire.png',
};

// Pages Smashie can hide on. Every page has several coordinate
// presets so the same page can host different spots on different
// days. Coordinates are % of page height (top) and % of viewport
// width (left).
export const HUNT_PAGES = [
  { path: '/', name: 'Home' },
  { path: '/menu', name: 'Menu' },
  { path: '/milkshakes', name: 'Milkshakes' },
  { path: '/about', name: 'About' },
  { path: '/reviews', name: 'Reviews' },
  { path: '/gallery', name: 'Gallery' },
  { path: '/contact', name: 'Contact' },
  { path: '/rewards', name: 'Rewards' },
  { path: '/connect', name: 'Connect' },
  { path: '/combos', name: 'Combos' },
  { path: '/community-news', name: 'Isle Update' },
  { path: '/meet-smashie', name: 'Meet Smashie' },
];

const SPOT_PRESETS = [
  { top: 12, left: 78 },
  { top: 30, left: 8 },
  { top: 46, left: 62 },
  { top: 68, left: 20 },
  { top: 82, left: 72 },
  { top: 22, left: 40 },
  { top: 58, left: 88 },
  { top: 8, left: 14 },
  { top: 74, left: 45 },
  { top: 38, left: 70 },
  { top: 90, left: 30 },
  { top: 50, left: 32 },
];

// Deterministic string hash so the same date always produces the
// same spots, without storing them anywhere.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function minutesOfDay(timeStr) {
  const [h, m] = (timeStr || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function todayStr(now) {
  const d = now instanceof Date ? now : new Date();
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); // YYYY-MM-DD
}

export function inDateRange(dateStr, start, end) {
  const s = start || HUNT_START_DATE;
  const e = end || HUNT_END_DATE;
  return dateStr >= s && dateStr <= e;
}

/**
 * Compute the full hunt state for a moment in store-local time.
 * `now` minutes-of-day and open/close come from the caller so the
 * caller can source business hours from MenuSetting.
 */
export function getHuntSpot({ dateStr, phase, nowMinutes }) {
  const h = hash(`${dateStr}:${phase}`);
  // Split the hash so page choice and position aren't locked together.
  const page = HUNT_PAGES[h % HUNT_PAGES.length];
  const spot = SPOT_PRESETS[Math.floor(h / 13) % SPOT_PRESETS.length];
  return {
    phase, // 'pumpkin' | 'vampire'
    page,
    topPct: spot.top,
    leftPct: spot.left,
    image: SMASHIE_IMAGES[phase],
    alt: phase === 'pumpkin' ? 'Smashie in his pumpkin costume' : 'Smashie dressed as a vampire',
  };
}

/**
 * Which phase is live right now? Returns null when outside game
 * hours (before open / after close).
 */
export function getHuntPhase({ nowMinutes, openMinutes, closeMinutes }) {
  if (nowMinutes < openMinutes || nowMinutes >= closeMinutes) return null;
  return nowMinutes < minutesOfDay(VAMPIRE_SWITCH_TIME) ? 'pumpkin' : 'vampire';
}

export function phaseLabel(phase) {
  if (phase === 'pumpkin') return 'Pumpkin Smashie';
  if (phase === 'vampire') return 'Vampire Smashie';
  return '';
}

export function winnerDisplayName(winner) {
  if (!winner) return '';
  const name = (winner.winner_name || '').trim();
  if (name) return name;
  return 'A lucky finder';
}

export { minutesOfDay };