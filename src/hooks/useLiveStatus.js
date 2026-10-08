import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useBusinessHours from '@/hooks/useBusinessHours';
import useStoreClosure from '@/hooks/useStoreClosure';
import { getMenuSetting } from '@/lib/menuSettings';
import { fetchBusyness } from '@/lib/busynessCache';
import { getBusynessStage, BUSYNESS_STAGES } from '@/lib/busynessStages';
import { chicagoNow } from '@/lib/chicagoNow';
import { formatTime12 } from '@/lib/businessHours';
import { isOpenAllDay } from '@/lib/openAllDay';

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
  const [openAllDayDate, setOpenAllDayDate] = useState('');
  const [openAllDayUntil, setOpenAllDayUntil] = useState('');
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
      if (!active) return;
      if (typeof s?.ordering_enabled === 'boolean') setOrderingEnabled(s.ordering_enabled);
      // Date-scoped 24/7 ordering override (MenuSetting.open_all_day_date, with
      // its optional open_all_day_until end) — fixed, so it expires on its own.
      setOpenAllDayDate(s?.open_all_day_date || '');
      setOpenAllDayUntil(s?.open_all_day_until || '');
    });
    const id = setInterval(() => setNow(chicagoNow()), 15000);
    return () => { active = false; clearInterval(id); };
  }, []);

  // MenuSetting.open_all_day_date (optionally stretched by open_all_day_until)
  // keeps ordering open around the clock — the bar reads open with no closing
  // countdown instead of "Closed" once the normal closing time has passed.
  const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  const openAllDay = isOpenAllDay(
    { open_all_day_date: openAllDayDate, open_all_day_until: openAllDayUntil },
    todayKey,
    now.totalMinutes,
  );

  const todayHours = businessHours?.[now.dayKey] || {};
  const closeMins = (() => {
    if (!todayHours.close) return null;
    const [h, m] = todayHours.close.split(':').map(Number);
    return h * 60 + (m || 0);
  })();
  const minutesUntilClose =
    closeMins != null && !todayHours.closed ? closeMins - now.totalMinutes : null;

  const openMins = (() => {
    if (!todayHours.open) return null;
    const [h, m] = todayHours.open.split(':').map(Number);
    return h * 60 + (m || 0);
  })();
  const minutesUntilOpen =
    openMins != null && !todayHours.closed ? openMins - now.totalMinutes : null;

  const isClosed =
    closure.closed ||
    (!openAllDay && (
      data?.busyness_level === 'Closed' ||
      todayHours.closed === true ||
      (minutesUntilClose != null && minutesUntilClose <= 0)
    ));
  const closingSoon =
    !openAllDay &&
    !isClosed &&
    minutesUntilClose != null &&
    minutesUntilClose > 0 &&
    minutesUntilClose <= CLOSING_SOON_WINDOW;

  // Online ordering unlocks before the doors do, so the kitchen has no real
  // load yet. In that window the bar counts down to opening instead of
  // quoting a busyness level that hasn't happened.
  const preOpen =
    !openAllDay &&
    !closure.closed &&
    !todayHours.closed &&
    minutesUntilOpen != null &&
    minutesUntilOpen > 0;

  let level = null;
  if (!isClosed && data && data.busyness_level !== 'Closed') {
    // Trust the backend's computed level (single source of truth) so the
    // top bar always matches the data the hero card reads. Fall back to a
    // client-side recompute only if the backend didn't send a level.
    level = BUSYNESS_STAGES.find(s => s.level === data.busyness_level) || getBusynessStage(data.liveCount ?? 0);
  }

  return {
    loading: !data,
    isClosed,
    closingSoon,
    preOpen,
    minutesUntilOpen,
    openTime: !todayHours.closed && todayHours.open ? formatTime12(todayHours.open) : null,
    level,
    wait: data?.estimated_wait || level?.waitRange,
    waitMin: data?.estimated_wait_min ?? level?.waitMin ?? 24,
    recovering: data?.recovering ?? false,
    activeCount: data?.activeCount ?? 0,
    orderingEnabled,
    minutesUntilClose,
    closeTime: openAllDay || !todayHours.close ? null : formatTime12(todayHours.close),
    closureMessage: closure.message || data?.closure_message || '',
  };
}