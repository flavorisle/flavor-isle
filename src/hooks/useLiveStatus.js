import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useBusinessHours from '@/hooks/useBusinessHours';
import useStoreClosure from '@/hooks/useStoreClosure';
import { getMenuSetting } from '@/lib/menuSettings';
import { fetchBusyness } from '@/lib/busynessCache';
import { getBusynessStage, BUSYNESS_STAGES, getStageMeta, RECOVERING_META, CLOSED_META } from '@/lib/busynessStages';
import { chicagoNow } from '@/lib/chicagoNow';
import { formatTime12 } from '@/lib/businessHours';

// Minutes before today's close where the bar switches to the
// "closing soon — order now" urgency state.
const CLOSING_SOON_WINDOW = 60;

// Single source of truth for the always-on-top live status bar.
// Merges the getBusyness backend (live kitchen load, ~90% accurate) with
// business hours + admin closure + ordering_enabled so the bar can show
// a busyness level, a closing-soon urgency, or a closed state.
export default function useLiveStatus() {
  const businessHours = useBusinessHours();
  const closure = useStoreClosure();
  const [data, setData] = useState(null);
  const [orderingEnabled, setOrderingEnabled] = useState(true);
  const [now, setNow] = useState(() => chicagoNow());

  // Poll the live busyness backend every 60s.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await fetchBusyness();
        if (active) setData(data);
      } catch {
        /* keep last known state */
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => { active = false; clearInterval(id); };
  }, []);

  // Re-read ordering_enabled and tick "now" every 15s so the closing-soon
  // countdown stays fresh without waiting for the next busyness poll.
  useEffect(() => {
    let active = true;
    getMenuSetting().then((s) => {
      if (active && typeof s?.ordering_enabled === 'boolean') setOrderingEnabled(s.ordering_enabled);
    });
    const id = setInterval(() => setNow(chicagoNow()), 15000);
    return () => { active = false; clearInterval(id); };
  }, []);

  const todayHours = businessHours?.[now.dayKey] || {};
  const closeMins = (() => {
    if (!todayHours.close) return null;
    const [h, m] = todayHours.close.split(':').map(Number);
    return h * 60 + (m || 0);
  })();
  const minutesUntilClose =
    closeMins != null && !todayHours.closed ? closeMins - now.totalMinutes : null;

  const isClosed =
    data?.busyness_level === 'Closed' ||
    closure.closed ||
    todayHours.closed === true ||
    (minutesUntilClose != null && minutesUntilClose <= 0);
  const closingSoon =
    !isClosed &&
    minutesUntilClose != null &&
    minutesUntilClose > 0 &&
    minutesUntilClose <= CLOSING_SOON_WINDOW;

  let level = null;
  if (!isClosed && data && data.busyness_level !== 'Closed') {
    // Trust the backend's computed level (single source of truth) so the
    // top bar always matches the data the hero card reads. Fall back to a
    // client-side recompute only if the backend didn't send a level.
    level = BUSYNESS_STAGES.find(s => s.level === data.busyness_level) || getBusynessStage(data.liveCount ?? 0);
  }

  const recovering = data?.recovering ?? false;
  const levelName = level?.level || 'Running Smooth';
  // Backend is the single source of truth for the 5 modes (chill, steady,
  // flex, full-smash, melt) + closed. Fall back to a local derivation only
  // if the backend didn't send mode/color.
  const meta = isClosed
    ? CLOSED_META
    : (data?.mode && data?.color)
      ? { icon: data.mode, color: data.color }
      : recovering ? RECOVERING_META : getStageMeta(levelName);

  return {
    loading: !data,
    isClosed,
    closingSoon,
    level,
    wait: data?.estimated_wait || level?.waitRange,
    waitMin: data?.estimated_wait_min ?? level?.waitMin ?? 20,
    recovering,
    activeCount: data?.activeCount ?? 0,
    liveCount: data?.liveCount ?? 0,
    busyPercent: data?.busyPercent ?? 0,
    color: meta.color,
    icon: meta.icon,
    orderingEnabled,
    minutesUntilClose,
    closeTime: todayHours.close ? formatTime12(todayHours.close) : null,
    closureMessage: closure.message || data?.closure_message || '',
  };
}