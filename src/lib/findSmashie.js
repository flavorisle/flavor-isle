// ─────────────────────────────────────────────────────────────
// Find Smashie — Halloween Hide & Seek (October game)
//
// Runs Oct 15 through Oct 31. Every day Smashie hides somewhere on
// the site. Pumpkin Smashie
// hides from open until 5:00 PM; if nobody has found him by 5 PM,
// he moves to a NEW hiding spot as Vampire Smashie until close.
// First signed-in player to click him wins their choice of
// 100 Star Rewards points or an instant free milkshake.
// ─────────────────────────────────────────────────────────────

export const HUNT_START_DATE = '2026-10-15';
export const HUNT_END_DATE = '2026-10-31';
// The site starts advertising the game before the hunt opens: the site-wide
// banner and the promo band tease it from this date.
export const HUNT_PROMO_START_DATE = '2026-10-09';
export const VAMPIRE_SWITCH_TIME = '17:00'; // 5:00 PM store-local

// The Square categories that hold shakes: "Whirl & Twirl" is the made-to-order
// shake and malt list, "Blend & Bliss" the specialty Bliss shakes. Both are
// shakes the free-prize winner can pick, so checkout counts both. Mirrored on the
// server in base44/shared/findSmashiePrize.ts.
export const SHAKE_CATEGORIES = ['Whirl & Twirl', 'Blend & Bliss'];
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

/** 'YYYY-MM-DD' -> 'October 15', for promo copy. */
export function formatHuntDate(dateStr) {
  if (!dateStr) return '';
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

/**
 * Is this YYYY-MM-DD one of the hunt's days? The window is locked for this
 * season — Oct 15 through Oct 31 inclusive — so the game starts and stops on
 * the right days whatever the saved settings record holds.
 */
export function inDateRange(dateStr) {
  return dateStr >= HUNT_START_DATE && dateStr <= HUNT_END_DATE;
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

// ── The riddle bank (issue #109) ──
//
// The locked 17-day bank: clue1 is the pumpkin-phase riddle (open until 5 PM)
// and is a riddle only — it never names the page or the spot. clue2 is the
// vampire-phase riddle (5 PM to close), which may name the page but never the
// corner he is hiding in. Text is copied verbatim from the approved bank; the
// crew can override any single day from Pulse (Admin → Find Smashie → Daily
// clues), which is stored in SmashieClue and beats this bank for that date.
export const HUNT_RIDDLES = {
  '2026-10-15': {
    clue1: "He's lurking where you'd go to reach us — phone, map, or a friendly hello. He won't pick up, but he IS there.",
    clue2: "The sun's down and he's back at our front door. He's on the Home page — where every visit starts.",
  },
  '2026-10-16': {
    clue1: "He's admiring himself on the one page that's ALL about him. The cheek.",
    clue2: "Star chasers, look sharp — he's skulking on the Rewards page, where the points pile up.",
  },
  '2026-10-17': {
    clue1: "He's hiding among the kind words folks leave us. Read the compliments closely.",
    clue2: "He's moved to where you'd find our phone and directions. Give us a ring — or just find him. (Contact page.)",
  },
  '2026-10-18': {
    clue1: "He's tucked in where the stars live. Loyalty has its hiding spots.",
    clue2: "He's pairing up — he's on the Combos page, where the deals team up.",
  },
  '2026-10-19': {
    clue1: "Something's swirled in with the frosty flavors. He's chilling where the shakes live.",
    clue2: "He's gone social — the Connect page, where the isle meets the internet.",
  },
  '2026-10-20': {
    clue1: "Extra, extra! He's hiding among the town talk and the latest isle news.",
    clue2: "He's hiding with the five-star tales — the Reviews page, where the love notes live.",
  },
  '2026-10-21': {
    clue1: "He's buried in our story — the tale of how the isle began.",
    clue2: "Say cheese! He's posing on the Gallery page, hiding among the snapshots.",
  },
  '2026-10-22': {
    clue1: "He's where you'd follow, tag, or subscribe. Lurking in the social scene.",
    clue2: "News flash — he's moved to the Isle Update page, among the headlines.",
  },
  '2026-10-23': {
    clue1: "Picture this: a red burger in a frame. He's hiding among our photos.",
    clue2: "Deal hunters — he's on the Combos page, where the pairings pay off.",
  },
  '2026-10-24': {
    clue1: "Frosty alert: he's back among the shakes. Blend in, little pumpkin.",
    clue2: "He's run home. Check the Home page top to bottom.",
  },
  '2026-10-25': {
    clue1: "He's where two tastes team up — hiding among the duos.",
    clue2: "Hungry? He's on the Menu page, hiding among our favorites. Don't order him.",
  },
  '2026-10-26': {
    clue1: "He's right at the front door of the whole site — where everyone lands first.",
    clue2: "He's gone frosty again — the Milkshakes page, where the swirls live.",
  },
  '2026-10-27': {
    clue1: "Same story, new chapter — he's back where the isle's tale is told.",
    clue2: "He stayed put in our story! Still the About page — new corner.",
  },
  '2026-10-28': {
    clue1: "Reach out — he's hiding where our number and directions live.",
    clue2: "He's made the connection — the Connect page, where the socials live.",
  },
  '2026-10-29': {
    clue1: "He's hiding among the whole spread. Every burger's a suspect.",
    clue2: "Still hungry? He's STILL on the Menu page — new hiding spot. Don't stop at the fries.",
  },
  '2026-10-30': {
    clue1: "Back to the beginning — he's tucked into the isle's own story.",
    clue2: "Halloween eve! He's posing on the Gallery page, among the pictures.",
  },
  '2026-10-31': {
    clue1: "HALLOWEEN! He's at the very front door. Start where every visit starts.",
    clue2: "Last hiding spot of the year — he's among the shakes one final time. (Milkshakes page.)",
  },
};

/**
 * Today's riddle for the phase that is live. A Pulse override saved for this
 * exact date wins; otherwise the bank. An empty string means no riddle is on
 * file for the day, so the clue surfaces stay quiet rather than inventing one.
 */
export function getHuntClue({ dateStr, phase, overrides } = {}) {
  const day = HUNT_RIDDLES[dateStr] || null;
  const override = overrides && overrides.game_date === dateStr ? overrides : null;
  if (phase === 'vampire') return String(override?.clue_2 || day?.clue2 || '').trim();
  if (phase === 'pumpkin') return String(override?.clue_1 || day?.clue1 || '').trim();
  return '';
}

/** First name only, capitalized — clue surfaces say "Wesley", never "wesleyrbooker1". */
export function winnerFirstName(winner) {
  const name = String(winner?.name || winner?.winner_name || '').trim();
  if (!name) return 'A lucky finder';
  const first = name.split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/**
 * The one line every clue surface shows: the day's riddle, the FOUND message
 * once somebody has won, or where the hunt stands outside open hours. Banner,
 * footer chip, corner chips and the Find Smashie page all read this, so they can
 * never disagree with each other.
 */
export function huntClueText(hunt) {
  if (!hunt) return '';
  if (hunt.winner) {
    const at = hunt.winner.time ? ` at ${hunt.winner.time}` : '';
    return `FOUND! ${winnerFirstName(hunt.winner)} spotted Smashie${at}. Come back tomorrow at open — he's hiding somewhere brand new.`;
  }
  if (hunt.clue) return hunt.clue;
  if (hunt.started === false) return `The hunt opens ${formatHuntDate(hunt.startDate)} — get ready!`;
  return hunt.closedNote || '';
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