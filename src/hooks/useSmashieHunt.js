import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  todayStr, getHuntPhase, getHuntSpot, getHuntHint, minutesOfDay, VAMPIRE_SWITCH_TIME,
  HUNT_START_DATE, HUNT_END_DATE, HUNT_PROMO_START_DATE,
} from '@/lib/findSmashie';

const HUNT_REFRESH_EVENT = 'smashie-hunt-update';
const DEFAULT_OPEN = 630;   // 10:30 AM when the store's hours aren't loaded
const DEFAULT_CLOSE = 1200; // 8:00 PM when the store's hours aren't loaded

function storeMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date);
  const get = (type) => parseInt(parts.find((p) => p.type === type)?.value, 10) || 0;
  return get('hour') * 60 + get('minute');
}

/**
 * What the site should show for Find Smashie right now.
 *
 * Returns null until the hunt state has loaded, then:
 *   { show: false }                                nothing to show
 *   { show: true, started: false, startDate }      advertising window, hunt not open yet
 *   { show: true, started: true, phase, spot, hint, winner }
 *
 * Recomputes every minute so the hint follows Smashie when he switches to his
 * vampire spot at 5 PM.
 */
export default function useSmashieHunt() {
  const [state, setState] = useState(null);
  const [nowMinutes, setNowMinutes] = useState(() => storeMinutes());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await base44.functions.invoke('getSmashieHuntState', {});
        if (!cancelled) setState(data);
      } catch (e) {
        // Branch-preview fallback: if the backend function isn't deployed on
        // this branch, assume the game is on so the promo can be reviewed.
        if (!cancelled) {
          setState({
            active: true, start_date: HUNT_START_DATE, end_date: HUNT_END_DATE,
            preview_mode: true, today_winner: null, hours: null,
          });
        }
      }
    };
    load();
    const onUpdate = () => load();
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

  // Advertising runs from the promo start date through the last hunt day.
  if (!state.active || today < HUNT_PROMO_START_DATE || today > endDate) {
    return { show: false, started: false, startDate, phase: null, spot: null, hint: null, winner };
  }

  if (today < startDate) {
    return { show: true, started: false, startDate, phase: null, spot: null, hint: null, winner };
  }

  const hours = state.hours;
  const phase = state.preview_mode
    ? (nowMinutes < minutesOfDay(VAMPIRE_SWITCH_TIME) ? 'pumpkin' : 'vampire')
    : getHuntPhase({
        nowMinutes,
        openMinutes: hours ? minutesOfDay(hours.open) : DEFAULT_OPEN,
        closeMinutes: hours ? minutesOfDay(hours.close) : DEFAULT_CLOSE,
      });

  if (!phase) return { show: true, started: true, startDate, phase: null, spot: null, hint: null, winner };

  const spot = getHuntSpot({ dateStr: today, phase, nowMinutes });
  return { show: true, started: true, startDate, phase, spot, hint: getHuntHint({ spot, phase }), winner };
}