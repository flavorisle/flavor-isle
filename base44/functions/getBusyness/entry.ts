import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { todayChicago } from '../../shared/busynessTime.ts';
import { getLiveBusyness } from '../../shared/liveBusyness.ts';

// Public read for the landing page "How busy are we?" card.
// Returns today's 24-hour typical-traffic chart + the live current status.

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

    // 60-min rolling count from today's hourly totals — kept only for the
    // "busier than usual" comparison against the historical hourly average.
    const sixtyMinCount = Math.round((prevCount * (60 - minute)) / 60) + curHourCount;

    const busyPercent = avgForHour > 0
      ? Math.round((sixtyMinCount / avgForHour) * 100)
      : (sixtyMinCount > 0 ? 100 : 0);

    // The live counts, level and wait all come from the shared live helper
    // (BusyPulse), so the site, the status bar, and the order emails quote the
    // same numbers instead of three different prorations of an hourly total.
    const liveStatus = await getLiveBusyness(base44);

    if (liveStatus.isClosed) {
      return Response.json({
        weekday: today.weekday,
        hour: today.hour,
        date: today.dateKey,
        chart,
        peakAvg,
        liveCount: 0,
        activeCount: 0,
        recentInflow: 0,
        last30: 0,
        last10: 0,
        curHourCount,
        avgForHour,
        busyPercent,
        busyness_level: 'Closed',
        estimated_wait: 'Closed',
        estimated_wait_min: 0,
        recovering: false,
        closure_message: liveStatus.closure_message,
      });
    }

    return Response.json({
      weekday: today.weekday,
      hour: today.hour,
      date: today.dateKey,
      chart,
      peakAvg,
      liveCount: liveStatus.last30,
      activeCount: liveStatus.last10,
      recentInflow: liveStatus.recentInflow,
      last30: liveStatus.last30,
      last10: liveStatus.last10,
      curHourCount,
      avgForHour,
      busyPercent,
      busyness_level: liveStatus.busyness_level,
      estimated_wait: liveStatus.estimated_wait,
      estimated_wait_min: liveStatus.estimated_wait_min,
      recovering: liveStatus.recovering,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}