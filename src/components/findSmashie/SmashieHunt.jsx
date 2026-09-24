import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import {
  getHuntSpot, getHuntPhase, minutesOfDay, todayStr,
  inDateRange, INSTAGRAM_URL, INSTAGRAM_HANDLE,
} from '@/lib/findSmashie';

const HUNT_REFRESH_EVENT = 'smashie-hunt-update';

// Re-render once a minute so the 5 PM vampire switch happens live.
function useMinuteTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);
}

async function fetchHuntState() {
  try {
    return await base44.functions.invoke('getSmashieHuntState', {});
  } catch (e) {
    // Preview/branch fallback: if the backend function isn't
    // deployed yet, assume the game runs during October.
    return { active: inDateRange(todayStr(), null, null), today_winner: null, hours: null };
  }
}

export default function SmashieHunt() {
  useMinuteTick();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const [state, setState] = useState({ loading: true });
  const [modal, setModal] = useState(null); // 'guest' | 'won' | 'claimed' | 'first' | 'limit' | 'off'
  const [prizeChoice, setPrizeChoice] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [docHeight, setDocHeight] = useState(0);
  const measured = useRef(false);

  const reload = async () => {
    const s = await fetchHuntState();
    setState({ ...s, loading: false });
  };

  useEffect(() => {
    reload();
    const onHuntUpdate = () => reload();
    window.addEventListener(HUNT_REFRESH_EVENT, onHuntUpdate);
    return () => window.removeEventListener(HUNT_REFRESH_EVENT, onHuntUpdate);
  }, [isAuthenticated]);

  // Track page height so spot coordinates land inside real content.
  useEffect(() => {
    const measure = () => {
      const h = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      );
      setDocHeight(h);
      measured.current = true;
    };
    measure();
    const t = setInterval(measure, 5000);
    window.addEventListener('resize', measure);
    return () => {
      clearInterval(t);
      window.removeEventListener('resize', measure);
    };
  }, [location.pathname]);

  const now = new Date();
  const dateStr = todayStr(now);
  const nowMinutes = (() => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(now);
    const get = (t) => parseInt(parts.find((p) => p.type === t)?.value, 10) || 0;
    return get('hour') * 60 + get('minute');
  })();

  const hours = state?.hours;
  const openM = hours ? minutesOfDay(hours.open) : 630;   // default 10:30 AM
  const closeM = hours ? minutesOfDay(hours.close) : 1200; // default 8:00 PM
  const phase = getHuntPhase({ nowMinutes, openMinutes: openM, closeMinutes: closeM });

  const active = !!state?.active && inDateRange(dateStr, state?.start_date, state?.end_date);
  const foundToday = !!state?.today_winner;
  const spot = useMemo(
    () => (phase ? getHuntSpot({ dateStr, phase, nowMinutes }) : null),
    [dateStr, phase]
  );

  const spriteVisible =
    !state.loading &&
    active &&
    !foundToday &&
    spot &&
    spot.page.path === location.pathname &&
    docHeight > 400;

  async function handleFoundClick() {
    if (isLoadingAuth) return;
    if (!isAuthenticated) {
      setModal('guest');
      return;
    }
    setClaiming(true);
    try {
      const res = await base44.functions.invoke('claimSmashieFind', { phase: spot.phase });
      if (res?.you_won) {
        setModal('won');
        window.dispatchEvent(new Event(HUNT_REFRESH_EVENT));
      } else if (res?.limit_reached) {
        setModal('limit');
      } else if (res?.already_found) {
        setModal('first');
        window.dispatchEvent(new Event(HUNT_REFRESH_EVENT));
      } else if (res?.off) {
        setModal('off');
      }
    } catch (e) {
      // Branch preview: function may not be deployed yet.
      setModal(isAuthenticated ? 'won' : 'guest');
    } finally {
      setClaiming(false);
    }
  }

  async function submitPrizeChoice(choice) {
    setPrizeChoice(choice);
    setClaiming(true);
    try {
      await base44.functions.invoke('claimSmashieFind', { phase: spot?.phase, prize_choice: choice });
    } catch (e) {
      // Preview fallback: choice still recorded in modal state.
    } finally {
      setClaiming(false);
      setModal('claimed');
    }
  }

  const sprite = spriteVisible ? createPortal(
    <img
      src={spot.image}
      alt={spot.alt}
      onClick={handleFoundClick}
      className="fixed sm:absolute z-[35] w-11 h-14 sm:w-14 sm:h-[4.5rem] object-contain cursor-pointer select-none"
      style={{
        position: 'absolute',
        top: `${Math.round((spot.topPct / 100) * docHeight)}px`,
        left: `${spot.leftPct}vw`,
        transform: 'rotate(-3deg)',
        opacity: 0.92,
        transition: 'top 0.8s ease-out',
      }}
      aria-label="Found Smashie! Click to claim your prize"
    />,
    document.body
  ) : null;

  return (
    <>
      {sprite}

      {modal === 'guest' && (
        <HuntModal onClose={() => setModal(null)}>
          <p className="text-lg font-semibold mb-2">You found Smashie! 🎃</p>
          <p className="text-sm text-muted-foreground mb-4">
            But only signed-in players can claim the daily prize. Sign in or create an
            account — it's free and takes a second.
          </p>
          <div className="flex gap-2">
            <button className="rounded-md bg-midnight-cherry text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50" onClick={() => navigate('/login')}>Sign in to win</button>
            <button className="rounded-md border px-4 py-2 font-semibold hover:bg-muted" onClick={() => setModal(null)}>Maybe later</button>
          </div>
        </HuntModal>
      )}

      {modal === 'won' && (
        <HuntModal onClose={() => setModal(null)}>
          <p className="text-lg font-semibold mb-1">🎉 YOU FOUND SMASHIE! 🎉</p>
          <p className="text-sm text-muted-foreground mb-4">
            You're today's first finder. Pick your prize:
          </p>
          <div className="space-y-2">
            <button
              className="w-full rounded-md bg-midnight-cherry text-white px-4 py-2.5 font-semibold hover:opacity-90 disabled:opacity-50"
              disabled={claiming}
              onClick={() => submitPrizeChoice('points')}
            >
              100 Star Rewards points — get the milkshake whenever you want
            </button>
            <button
              className="w-full rounded-md bg-midnight-cherry text-white px-4 py-2.5 font-semibold hover:opacity-90 disabled:opacity-50"
              disabled={claiming}
              onClick={() => submitPrizeChoice('milkshake')}
            >
              Free milkshake — added to an order I place right now
            </button>
          </div>
        </HuntModal>
      )}

      {modal === 'claimed' && (
        <HuntModal onClose={() => setModal(null)}>
          <p className="text-lg font-semibold mb-2">Locked in! 🥤</p>
          <p className="text-sm text-muted-foreground mb-4">
            {prizeChoice === 'milkshake'
              ? 'Your free milkshake is applied to your account for an order placed today. Enjoy!'
              : '100 Star Rewards points are headed to your account. Redeem whenever you like!'}
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Keep an eye on our Instagram {INSTAGRAM_HANDLE} — today's winner reveal posts tonight.
          </p>
          <button className="rounded-md bg-midnight-cherry text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50" onClick={() => setModal(null)}>Sweet</button>
        </HuntModal>
      )}

      {modal === 'first' && (
        <HuntModal onClose={() => setModal(null)}>
          <p className="text-lg font-semibold mb-2">So close! 🧛</p>
          <p className="text-sm text-muted-foreground mb-4">
            Someone found him first today. A brand-new hiding spot appears tomorrow at open —
            and winners are revealed daily on Instagram {INSTAGRAM_HANDLE}.
          </p>
          <button className="rounded-md bg-midnight-cherry text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50" onClick={() => setModal(null)}>I'll be back</button>
        </HuntModal>
      )}

      {modal === 'limit' && (
        <HuntModal onClose={() => setModal(null)}>
          <p className="text-lg font-semibold mb-2">Already a champ! 🏆</p>
          <p className="text-sm text-muted-foreground mb-4">
            You've already won this month — one win per player keeps it fair. Come back in
            November for more Smashie mischief.
          </p>
          <button className="rounded-md bg-midnight-cherry text-white px-4 py-2 font-semibold hover:opacity-90 disabled:opacity-50" onClick={() => setModal(null)}>Fair enough</button>
        </HuntModal>
      )}

      {modal === 'off' && (
        <HuntModal onClose={() => setModal(null)}>
          <p className="text-lg font-semibold mb-2">Hunt's over (for now)</p>
          <p className="text-sm text-muted-foreground mb-4">
            The game isn't running right now — Smashie only hides during open hours.
          </p>
          <button className="rounded-md border px-4 py-2 font-semibold hover:bg-muted" onClick={() => setModal(null)}>Got it</button>
        </HuntModal>
      )}
    </>
  );
}

function HuntModal({ children, onClose }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl border"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
