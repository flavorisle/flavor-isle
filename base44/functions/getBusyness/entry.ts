import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { todayChicago } from '../../shared/busynessTime.ts';
import { getBusynessStage, COOK_WINDOW_MINUTES } from '../../shared/busynessStages.ts';

// Public read for the landing page "How busy are we?" card.
// Returns today's 24-hour typical-traffic chart + the live current-hour status.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const today = todayChicago();

    const [profiles, live] = await Promise.all([
      base44.asServiceRole.entities.BusynessProfile.filter({ weekday: today.weekday }),
      base44.asServiceRole.entities.HourlyCount.filter({ date: today.dateKey }),
    ]);

    const profMap = {};
    (profiles || []).forEach(p => { profMap[p.hour] = p; });
    const liveMap = {};
    (live || []).forEach(l => { liveMap[l.hour] = l.order_count; });

    const chart = [];
    for (let h = 0; h < 24; h++) {
      chart.push({
        hour: h,
        avg: +((profMap[h] && profMap[h].avg_order_count) || 0),
        live: liveMap[h] || 0,
      });
    }

    const peakAvg = chart.reduce((m, c) => Math.max(m, c.avg), 0);
    const cur = chart[today.hour] || { avg: 0, live: 0 };
    const avgForHour = cur.avg || 0;
    const curHourCount = cur.live || 0;

    const minute = today.minute || 0;
    const prevHour = (today.hour + 23) % 24;
    const prevCount = (chart[prevHour] || {}).live || 0;

    // 60-min rolling count — kept for the "busier than usual" comparison
    // against the historical hourly average (used by PopularTimesCard).
    const liveCount = Math.round((prevCount * (60 - minute)) / 60) + curHourCount;

    const busyPercent = avgForHour > 0
      ? Math.round((liveCount / avgForHour) * 100)
      : (liveCount > 0 ? 100 : 0);

    // Active queue depth: orders placed in the last COOK_WINDOW_MINUTES (20 min).
    // Orders older than the cook time have been served and no longer count
    // toward the kitchen backlog. This is what drives the busyness stage.
    let activeCount;
    if (minute >= COOK_WINDOW_MINUTES) {
      activeCount = Math.round((curHourCount * COOK_WINDOW_MINUTES) / minute);
    } else {
      const prevSlice = Math.round((prevCount * (COOK_WINDOW_MINUTES - minute)) / 60);
      activeCount = curHourCount + prevSlice;
    }

    const stage = getBusynessStage(activeCount);

    return Response.json({
      weekday: today.weekday,
      hour: today.hour,
      date: today.dateKey,
      chart,
      peakAvg,
      liveCount,
      activeCount,
      curHourCount,
      avgForHour,
      busyPercent,
      busyness_level: stage.level,
      estimated_wait: stage.waitRange,
      estimated_wait_min: stage.waitMin,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}