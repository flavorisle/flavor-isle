import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import {
  getHuntSpot, getHuntPhase, minutesOfDay, todayStr,
  inDateRange, VAMPIRE_SWITCH_TIME, INSTAGRAM_URL, INSTAGRAM_HANDLE, SMASHIE_IMAGES,
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
    const { data } = await base44.functions.invoke('getSmashieHuntState', {});
    return data;
  } catch (e) {
    // Branch-preview fallback: if the backend function isn't
    // deployed on this branch, assume the game is ON in preview
    // mode (hours ignored) so the game can be tested anytime.
    return {
      active: true,
      start_date: '2026-09-23',
      end_date: '2026-10-31',
      preview_mode: true,
      today_winner: null,
      hours: null,
    };
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

  // Preview override: ?hunt-preview forces the sprite visible on the current
  // page so the game can be reviewed outside the October/hours window.
  const preview = new URLSearchParams(window.location.search).has('hunt-preview');

  const hours = state?.hours;
  const openM = hours ? minutesOfDay(hours.open) : 630;   // default 10:30 AM
  const closeM = hours ? minutesOfDay(hours.close) : 1200; // default 8:00 PM
  // Preview mode (admin setting): Smashie ignores open/close hours
  // so the game can be tested anytime. Turn OFF before the live
  // October launch. ?hunt-preview still overrides everything.
  const phase = (state?.preview_mode && !preview)
    ? (nowMinutes < minutesOfDay(VAMPIRE_SWITCH_TIME) ? 'pumpkin' : 'vampire')
    : getHuntPhase({ nowMinutes, openMinutes: openM, closeMinutes: closeM });

  const active = !!state?.active && inDateRange(dateStr, state?.start_date, state?.end_date);
  const foundToday = !!state?.today_winner;
  const spot = useMemo(
    () => (phase ? getHuntSpot({ dateStr, phase, nowMinutes }) : null),
    [dateStr, phase]
  );

  // In preview mode, force a pumpkin sprite onto whatever page you're on.
  const previewSpot = useMemo(
    () => preview
      ? {
          phase: 'pumpkin',
          page: { path: location.pathname, name: 'Preview' },
          topPct: 46,
          leftPct: 62,
          image: SMASHIE_IMAGES.pumpkin,
          alt: 'Smashie in his pumpkin costume (preview)',
        }
      : null,
    [preview, location.pathname]
  );

  const spriteVisible =
    !state.loading &&
    (preview || (active && !foundToday)) &&
    (preview ? previewSpot : spot) &&
    (preview ? true : spot.page.path === location.pathname) &&
    docHeight > 400;

  const activeSpot = preview ? previewSpot : spot;

  async function handleFoundClick() {
    if (isLoadingAuth) return;
    if (!isAuthenticated) {
      setModal('guest');
      return;
    }
    setClaiming(true);
    try {
      const { data: res } = await base44.functions.invoke('claimSmashieFind', { phase: activeSpot?.phase });
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
      await base44.functions.invoke('claimSmashieFind', { phase: activeSpot?.phase, prize_choice: choice });
    } catch (e) {
      // Preview fallback: choice still recorded in modal state.
    } finally {
      setClaiming(false);
      setModal('claimed');
    }
  }

  const renderSpot = preview ? previewSpot : spot;
  const sprite = spriteVisible && renderSpot ? createPortal(
    <img
      src={renderSpot.image}
      alt={renderSpot.alt}
      onClick={handleFoundClick}
      className="z-[35] w-14 h-16 object-contain cursor-pointer select-none"
      style={
        preview
          ? {
              position: 'fixed',
              top: '46vh',
              left: '62vw',
              transform: 'rotate(-3deg)',
              opacity: 0.95,
            }
          : {
              position: 'absolute',
              top: `${Math.round((renderSpot.topPct / 100) * docHeight)}px`,
              left: `${renderSpot.leftPct}vw`,
              transform: 'rotate(-3deg)',
              opacity: 0.92,
              transition: 'top 0.8s ease-out',
            }
      }
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