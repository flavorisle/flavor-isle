// Single source of truth for the live kitchen level and wait, shared by the
// public getBusyness endpoint and the server-side order emails/push
// notifications so every surface — site, status bar, and emails — quotes the
// same number.
//
// The input is BusyPulse: one row per Square order (online, phone and in-store
// POS alike), written by syncSquareBusyness. Counting real orders in a window
// is exact, unlike prorating an hourly total across the minutes elapsed.

import { todayChicago } from './busynessTime.ts';
import {
  getBusynessStage,
  LEVEL_HOLD_MINUTES,
  RECENT_WINDOW_MINUTES,
  COOK_CAPACITY_PER_HOUR,
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
  last30: number;
  last10: number;
  recentInflow: number;
  closure_message?: string;
}

const MIN = 60000;
// One read covers everything below: the held level looks back at most
// THROUGHPUT + LEVEL_HOLD minutes, which is 38 — 60 leaves headroom.
const PULSE_WINDOW_MINUTES = 60;

// Returns the current live kitchen status. `base44` is a service-role client
// (createClientFromRequest) from the calling backend function.
export async function getLiveBusyness(base44): Promise<LiveBusyness> {
  const storeStatus = await getStoreStatus(base44);
  if (!storeStatus.open) {
    return {
      isClosed: true,
      busyness_level: 'Closed',
      estimated_wait: 'Closed',
      estimated_wait_min: 0,
      recovering: false,
      last30: 0,
      last10: 0,
      recentInflow: 0,
      closure_message: storeStatus.message,
    };
  }

  const today = todayChicago();
  const nowMs = Date.now();

  // The only read for the level: every Square order in the last hour.
  const pulses = await base44.asServiceRole.entities.BusyPulse.filter({
    order_at: { $gte: new Date(nowMs - PULSE_WINDOW_MINUTES * MIN).toISOString() },
  }, '-order_at', 1000);

  const times = (pulses || [])
    .map((p) => Date.parse(p.order_at || ''))
    .filter((t) => Number.isFinite(t) && t <= nowMs);

  const countSince = (minutes) => times.filter((t) => t >= nowMs - minutes * MIN).length;

  const last30 = countSince(30);
  const last10 = countSince(10);
  const recentInflow = countSince(RECENT_WINDOW_MINUTES);

  // Level with an 8-minute hold: the highest 30-minute count seen in the last
  // LEVEL_HOLD_MINUTES minutes. The level rises the moment the count crosses a
  // threshold and cannot fall until the count has been under it for 8 straight
  // minutes.
  let heldCount = 0;
  for (let m = 0; m <= LEVEL_HOLD_MINUTES; m++) {
    const hi = nowMs - m * MIN;
    const lo = hi - 30 * MIN;
    const c = times.filter((t) => t > lo && t <= hi).length;
    if (c > heldCount) heldCount = c;
  }

  // Extra-cook boost: on an admin-flagged extra-cook day the kitchen clears
  // orders at double the rate, so it takes twice the volume to reach each level
  // and each queued order adds half the minutes. Auto-expires after the date.
  let levelCount = heldCount;
  let queue = last10;
  try {
    const setting = await getMenuSettingRecord(base44);
    if (setting?.extra_cook_date === today.dateKey) {
      levelCount = Math.round(heldCount / 2);
      queue = Math.round(last10 / 2);
    }
  } catch { /* normal speed */ }

  const stage = getBusynessStage(levelCount);
  const regressed = computeRegressedWait(levelCount, recentInflow, queue, stage);

  return {
    isClosed: false,
    busyness_level: stage.level,
    estimated_wait: regressed.waitRange,
    estimated_wait_min: regressed.waitMin,
    recovering: regressed.recovering,
    last30,
    last10,
    recentInflow,
  };
}