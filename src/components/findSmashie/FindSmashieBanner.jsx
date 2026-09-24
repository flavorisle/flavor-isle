import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { todayStr, inDateRange, INSTAGRAM_URL, INSTAGRAM_HANDLE } from '@/lib/findSmashie';

const HUNT_REFRESH_EVENT = 'smashie-hunt-update';

export default function FindSmashieBanner() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [state, setState] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const s = await base44.functions.invoke('getSmashieHuntState', {});
        if (!cancelled) setState(s);
      } catch (e) {
        // Preview fallback: show the banner during October even
        // if the backend function isn't deployed on this branch.
        if (!cancelled) setState({
          active: true, start_date: '2026-09-23', end_date: '2026-10-31',
          preview_mode: true, today_winner: null,
        });
      }
    };
    load();
    const onUpdate = () => load();
    window.addEventListener(HUNT_REFRESH_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(HUNT_REFRESH_EVENT, onUpdate);
    };
  }, []);

  if (!state) return null;
  const active = !!state.active && inDateRange(todayStr(), state.start_date, state.end_date);
  if (!active) return null;

  const winner = state.today_winner;
  const beforeStart = state.start_date && todayStr() < state.start_date;
  const startDateLabel = state.start_date
    ? new Date(state.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="w-full bg-midnight-cherry text-white text-xs sm:text-sm">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-center sm:text-left">
        {beforeStart ? (
          <p>
            🎃 <strong>Find Smashie starts {startDateLabel}!</strong> Every day in October, Smashie
            hides somewhere on this site — first signed-in finder wins a free milkshake or 100 Star
            Rewards points. Follow the daily winner reveals on Instagram&nbsp;
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="underline font-semibold">{INSTAGRAM_HANDLE}</a>
          </p>
        ) : winner ? (
          <p>
            🧛 <strong>Smashie was found by {winner.name || 'a lucky finder'}</strong>
            {winner.time ? ` at ${winner.time}` : ''} — new hiding spot tomorrow at open!
            Winners revealed daily on Instagram&nbsp;
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="underline font-semibold">{INSTAGRAM_HANDLE}</a>
          </p>
        ) : (
          <p>
            🎃 <strong>Find Smashie!</strong> He's hiding on the site right now — first
            signed-in finder wins a free milkshake or 100 Star Rewards points.
            Winners revealed daily on Instagram&nbsp;
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="underline font-semibold">{INSTAGRAM_HANDLE}</a>
          </p>
        )}
        <span className="flex shrink-0 gap-3 items-center">
          <Link to="/find-smashie" className="underline font-semibold">
            Rules &amp; winners
          </Link>
          {!isLoadingAuth && !isAuthenticated && (
            <Link to="/register" className="underline font-semibold">
              Sign up to play
            </Link>
          )}
        </span>
      </div>
    </div>
  );
}
