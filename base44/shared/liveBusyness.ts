// Single source of truth for the live kitchen wait, shared by the public
// getBusyness endpoint and the server-side order emails/push notifications so
// every surface — site, status bar, and emails — quotes the same number.
//
// Mirrors the computation in getBusyness/entry.ts (rolling 60-min throughput →
// busyness stage → regressed wait). Keeping it here lets emails run server-side
// without an extra HTTP round-trip back to the function.

import { todayChicago } from './busynessTime.ts';
import {
  getBusynessStage,
  COOK_WINDOW_MINUTES,
  THROUGHPUT_WINDOW_MINUTES,
  RECENT_WINDOW_MINUTES,
  QUIET_WINDOW_MINUTES,
  computeRegressedWait,
} from './busynessStages.ts';
import { getStoreStatus } from './storeClosure.ts';
import { getMenuSettingRecord } from './storeState.ts';

export interface LiveBusyness {
  isClosed: boolean;
  busyness_level: string;
  estimated_wait: string;
  estimated_wait_min: number;
  recovering: boolean;
  closure_message?: string;
}

// Returns the current live kitchen status. `base44` is a service-role client
// (createClientFromRequest) from the calling backend function.
export async function getLiveBusyness(base44): Promise<LiveBusyness> {
  const today = todayChicago();

  const [profiles, live] = await Promise.all([
    base44.asServiceRole.entities.BusynessProfile.filter({ weekday: today.weekday }),
    base44.asServiceRole.entities.HourlyCount.filter({ date: today.dateKey }),
  ]);

  const profMap = {};
  (profiles || []).forEach((p) => { profMap[p.hour] = p; });
  const liveMap = {};
  (live || []).forEach((l) => { liveMap[l.hour] = l.order_count; });

  const curHourCount = liveMap[today.hour] || 0;
  const prevHour = (today.hour + 23) % 24;
  const prevCount = liveMap[prevHour] || 0;
  const minute = today.minute || 0;

  // Rolling throughput count over THROUGHPUT_WINDOW_MINUTES — drives the
  // busyness stage. Orders age out of it twice as fast as the old 60-min
  // window, so the level recovers at double the rate.
  const W = THROUGHPUT_WINDOW_MINUTES;
  const liveCount = minute >= W
    ? Math.round((curHourCount * W) / minute)
    : curHourCount + Math.round((prevCount * (W - minute)) / 60);

  // Active queue depth over the cook window.
  let activeCount;
  if (minute >= COOK_WINDOW_MINUTES) {
    activeCount = Math.round((curHourCount * COOK_WINDOW_MINUTES) / minute);
  } else {
    const prevSlice = Math.round((prevCount * (COOK_WINDOW_MINUTES - minute)) / 60);
    activeCount = curHourCount + prevSlice;
  }

  const storeStatus = await getStoreStatus(base44);
  if (!storeStatus.open) {
    return {
      isClosed: true,
      busyness_level: 'Closed',
      estimated_wait: 'Closed',
      estimated_wait_min: 0,
      recovering: false,
      closure_message: storeStatus.message,
    };
  }

  // Extra-cook boost: when the admin flags today as an extra-cook day, the
  // kitchen completes orders at double the rate — waits shrink and it takes
  // more volume to hit each busyness stage. Auto-expires after the set date.
  let speedFactor = 1;
  try {
    const setting = await getMenuSettingRecord(base44);
    if (setting?.extra_cook_date === today.dateKey) speedFactor = 2;
  } catch { /* default to normal speed */ }

  // Quiet kitchen: with no new order for QUIET_WINDOW_MINUTES, the crew is
  // catching up with nothing new landing — so the board drains at double the
  // normal rate. Doubling the speed factor halves each queued order's minutes
  // and stretches the stage thresholds, letting the status walk itself back
  // down to Running Smooth instead of snapping there.
  try {
    const [lastOrder] = await base44.asServiceRole.entities.Order.list('-created_date', 1);
    if (lastOrder?.created_date) {
      const quietMinutes = (Date.now() - new Date(lastOrder.created_date).getTime()) / 60000;
      if (quietMinutes >= QUIET_WINDOW_MINUTES) speedFactor *= 2;
    }
  } catch { /* keep the normal drain rate */ }

  const stage = getBusynessStage(liveCount, speedFactor);

  let recentInflow;
  if (minute >= RECENT_WINDOW_MINUTES) {
    recentInflow = Math.round((curHourCount * RECENT_WINDOW_MINUTES) / minute);
  } else {
    const prevSlice = Math.round((prevCount * (RECENT_WINDOW_MINUTES - minute)) / 60);
    recentInflow = curHourCount + prevSlice;
  }

  const regressed = computeRegressedWait(liveCount, recentInflow, activeCount, stage, speedFactor);

  return {
    isClosed: false,
    busyness_level: stage.level,
    estimated_wait: regressed.waitRange,
    estimated_wait_min: regressed.waitMin,
    recovering: regressed.recovering,
  };
}