import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  todayStr, inDateRange, getHuntPhase, getHuntSpot, getHuntHint,
  minutesOfDay, VAMPIRE_SWITCH_TIME,
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
 * Live "where is he right now" view of the Find Smashie hunt: the current
 * phase (pumpkin before 5 PM, vampire after), his hiding spot, today's hint
 * and today's winner. Recomputes every minute so the hint follows him when
 * he moves to his vampire spot at 5 PM. Returns null until state has loaded.
 */
export default function useSmashieHint() {
  const [state, setState] = useState(null);
  const [nowMinutes, setNowMinutes] = useState(() => storeMinutes());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const s = await base44.functions.invoke('getSmashieHuntState', {});
        if (!cancelled) setState(s);
      } catch (e) {
        // Branch-preview fallback: if the backend function isn't deployed on
        // this branch, assume the game is on so the promo can be reviewed.
        if (!cancelled) {
          setState({
            active: true, start_date: '2026-10-15', end_date: '2026-11-01',
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

  const dateStr = todayStr();
  const winner = state.today_winner || null;
  if (!state.active || !inDateRange(dateStr, state.start_date, state.end_date)) {
    return { active: false, phase: null, spot: null, hint: null, winner };
  }

  const hours = state.hours;
  const phase = state.preview_mode
    ? (nowMinutes < minutesOfDay(VAMPIRE_SWITCH_TIME) ? 'pumpkin' : 'vampire')
    : getHuntPhase({
        nowMinutes,
        openMinutes: hours ? minutesOfDay(hours.open) : DEFAULT_OPEN,
        closeMinutes: hours ? minutesOfDay(hours.close) : DEFAULT_CLOSE,
      });

  if (!phase) return { active: true, phase: null, spot: null, hint: null, winner };

  const spot = getHuntSpot({ dateStr, phase, nowMinutes });
  return { active: true, phase, spot, hint: getHuntHint({ spot, phase }), winner };
}