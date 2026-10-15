import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { formatTime12 } from '@/lib/businessHours';
import {
  todayStr, getHuntPhase, getHuntSpot, getHuntClue, minutesOfDay, VAMPIRE_SWITCH_TIME,
  HUNT_START_DATE, HUNT_END_DATE, HUNT_PROMO_START_DATE,
} from '@/lib/findSmashie';

const HUNT_REFRESH_EVENT = 'smashie-hunt-update';
const DEFAULT_OPEN = 630;   // 10:30 AM when the store's hours aren't loaded
const DEFAULT_CLOSE = 1200; // 8:00 PM when the store's hours aren't loaded

// One hunt read is shared by every surface that shows a clue — the site banner,
// the footer chip and the corner chip can all be on the same page, and each extra
// copy would be another pair of calls against the app's read budget. A short
// shared cache keeps it to one read per page view; a win claimed in this tab
// clears it immediately through the refresh event, and thirty seconds is well
// inside the pace at which a riddle or the 5 PM switch can change.
const CACHE_MS = 30000;
let cache = null; // { at, state, overrides }
let inFlight = null;

function storeMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = (type) => parseInt(parts.find((p) => p.type === type)?.value, 10) || 0;
  return get('hour') * 60 + get('minute');
}

async function loadHunt() {
  const fresh = cache && Date.now() - cache.at < CACHE_MS;
  if (fresh) return cache;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const [stateRes, clueRes] = await Promise.all([
      base44.functions.invoke('getSmashieHuntState', {}).catch(() => null),
      // The crew's own riddle for today, when they saved one in Pulse.
      base44.entities.SmashieClue.filter({ game_date: todayStr() }).catch(() => null),
    ]);
    const state = stateRes?.data || stateRes || null;
    const list = Array.isArray(clueRes) ? clueRes : clueRes?.items;
    const overrides = (list && list[0]) || null;
    cache = {
      at: Date.now(),
      // Branch-preview fallback: if the backend function isn't deployed on this
      // branch, assume the game is on so the promo can be reviewed.
      state: state || {
        active: true, start_date: HUNT_START_DATE, end_date: HUNT_END_DATE,
        preview_mode: true, today_winner: null, hours: null,
      },
      overrides,
    };
    return cache;
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/**
 * What the site should show for Find Smashie right now.
 *
 * Returns null until the hunt state has loaded, then:
 *   { show: false }                                nothing to show
 *   { show: true, started: false, startDate }      advertising window, hunt not open yet
 *   { show: true, started: true, phase, spot, clue, winner }
 *
 * `clue` is today's riddle for the live phase (Clue 1 before 5 PM, Clue 2 after)
 * — never a plain "he is on the X page" hint. When he is outside his hunting
 * hours, `clue` is empty and `closedNote` says when the hunt opens again.
 *
 * Recomputes every minute so the clue follows Smashie when he switches to his
 * vampire spot at 5 PM.
 */
export default function useSmashieHunt() {
  const [state, setState] = useState(null);
  const [overrides, setOverrides] = useState(null);
  const [nowMinutes, setNowMinutes] = useState(() => storeMinutes());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const loaded = await loadHunt();
      if (cancelled) return;
      setState(loaded.state);
      setOverrides(loaded.overrides);
    };
    load();
    const onUpdate = () => { cache = null; load(); };
    window.addEventListener(HUNT_REFRESH_EVENT, onUpdate);
    const timer = setInterval(() => setNowMinutes(storeMinutes()), 60000);
    return () => {
      cancelled = true;
      window.removeEventListener(HUNT_REFRESH_EVENT, onUpdate);
      clearInterval(timer);
    };
  }, []);

  if (!state) return null;

  const today = todayStr();
  const winner = state.today_winner || null;
  const startDate = state.start_date || HUNT_START_DATE;
  const endDate = state.end_date || HUNT_END_DATE;

  // Test mode (the admin Preview switch) runs the hunt outside the locked
  // window, so the riddle and the sprite can be walked through before it opens. It
  // never reaches past the last hunt day, so a preview switch left on cannot keep
  // the game alive once the season is over.
  const testing = !!state.preview_mode && today <= endDate;

  // Advertising runs from the promo start date through the last hunt day.
  if (!state.active || (!testing && (today < HUNT_PROMO_START_DATE || today > endDate))) {
    return { show: false, started: false, startDate, phase: null, spot: null, clue: '', winner, closedNote: '' };
  }

  if (today < startDate && !testing) {
    return { show: true, started: false, startDate, phase: null, spot: null, clue: '', winner, closedNote: '' };
  }

  const hours = state.hours;
  const openMinutes = hours ? minutesOfDay(hours.open) : DEFAULT_OPEN;
  const closeMinutes = hours ? minutesOfDay(hours.close) : DEFAULT_CLOSE;
  const openLabel = formatTime12(hours?.open || '10:30');
  const phase = state.preview_mode
    ? (nowMinutes < minutesOfDay(VAMPIRE_SWITCH_TIME) ? 'pumpkin' : 'vampire')
    : getHuntPhase({
        nowMinutes,
        openMinutes,
        closeMinutes,
      });

  if (!phase) {
    return {
      show: true, started: true, startDate, phase: null, spot: null, clue: '', winner,
      closedNote: nowMinutes < openMinutes
        ? `The hunt opens at ${openLabel}.`
        : `The hunt opens again tomorrow at ${openLabel}.`,
    };
  }

  const spot = getHuntSpot({ dateStr: today, phase, nowMinutes });
  return {
    show: true, started: true, startDate, phase, spot, winner,
    clue: getHuntClue({ dateStr: today, phase, overrides }),
    closedNote: '',
  };
}