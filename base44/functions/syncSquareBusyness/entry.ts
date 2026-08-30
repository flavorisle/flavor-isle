import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { chicagoParts, todayChicago } from '../../shared/busynessTime.ts';
import { squareOrderWeight } from '../../shared/orderBusynessWeight.ts';

const SQUARE_VERSION = '2024-01-18';
const FULL_LOOKBACK_DAYS = 90;
const MAX_ORDERS = 20000;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const mode = body && body.mode === 'live' ? 'live' : 'full';

    const connection = await base44.asServiceRole.connectors.getConnection('square');
    if (!connection || !connection.accessToken) {
      return Response.json({ error: 'Square not connected' }, { status: 400 });
    }
    const headers = {
      Authorization: `Bearer ${connection.accessToken}`,
      'Square-Version': SQUARE_VERSION,
      'Content-Type': 'application/json',
    };

    // Resolve location id (from connector config, else first merchant location).
    let locationId = connection.connectionConfig && connection.connectionConfig.locationId;
    if (!locationId) {
      const locRes = await fetch('https://connect.squareup.com/v2/locations', { headers });
      const locData = await locRes.json();
      locationId = locData && locData.locations && locData.locations[0] && locData.locations[0].id;
    }
    if (!locationId) return Response.json({ error: 'Could not resolve Square location' }, { status: 500 });

    const pullStart = new Date(Date.now() - (mode === 'live' ? 3 * 3600000 : FULL_LOOKBACK_DAYS * 86400000)).toISOString();
    const today = todayChicago();
    const todayCounts = {};          // hour -> order count today
    const profileBuckets = {};       // `${weekday}-${hour}` -> { total, perDay{ dateKey -> count } }
    let ordersPulled = 0;
    let cursor = null;

    do {
      const sqBody = {
        location_ids: [locationId],
        limit: 1000,
        query: {
          filter: { date_time_filter: { created_at: { start_at: pullStart } } },
          sort: { sort_field: 'CREATED_AT', sort_order: 'ASC' },
        },
      };
      if (cursor) sqBody.cursor = cursor;

      const res = await fetch('https://connect.squareup.com/v2/orders/search', {
        method: 'POST', headers, body: JSON.stringify(sqBody),
      });
      const data = await res.json();
      if (!res.ok) { console.error('Square search failed', JSON.stringify(data)); break; }

      const orders = data.orders || [];
      for (let i = 0; i < orders.length; i++) {
        const o = orders[i];
        if (!o.created_at) continue;
        const p = chicagoParts(o.created_at);
        // Treat-only orders (shakes, bliss, crave waves, hot fudge cakes, …)
        // don't hit the grill, so they only count 1/2 toward busyness.
        const w = squareOrderWeight(o);
        if (p.dateKey === today.dateKey) todayCounts[p.hour] = (todayCounts[p.hour] || 0) + w;
        if (mode === 'full') {
          const k = p.weekday + '-' + p.hour;
          if (!profileBuckets[k]) profileBuckets[k] = { total: 0, perDay: {} };
          profileBuckets[k].total += w;
          profileBuckets[k].perDay[p.dateKey] = (profileBuckets[k].perDay[p.dateKey] || 0) + w;
        }
      }
      ordersPulled += orders.length;
      cursor = data.cursor || null;
    } while (cursor && ordersPulled < MAX_ORDERS);

    // ---- Upsert today's HourlyCount rows ----
    // 'full' mode refreshes all 24 hours of today; 'live' mode only touches
    // the hours that actually had orders in the last 3 hours (so earlier
    // counts are preserved instead of being zeroed out).
    const existingHC = await base44.asServiceRole.entities.HourlyCount.filter({ date: today.dateKey });
    const hcIds = {};
    (existingHC || []).forEach(h => { hcIds[h.hour] = h.id; });
    const hoursToWrite = mode === 'full'
      ? Array.from({ length: 24 }, (_, i) => i)
      : Object.keys(todayCounts).map(Number);
    const hcUp = [];
    const hcCr = [];
    hoursToWrite.forEach(h => {
      const rec = { date: today.dateKey, hour: h, weekday: today.weekday, order_count: +((todayCounts[h] || 0).toFixed(1)) };
      const id = hcIds[h];
      if (id) hcUp.push({ id, ...rec }); else hcCr.push(rec);
    });
    if (hcUp.length) await base44.asServiceRole.entities.HourlyCount.bulkUpdate(hcUp);
    if (hcCr.length) await base44.asServiceRole.entities.HourlyCount.bulkCreate(hcCr);

    // ---- Rebuild the weekday x hour profile (full mode only) ----
    let profileWritten = 0;
    if (mode === 'full') {
      const existingP = await base44.asServiceRole.entities.BusynessProfile.filter({});
      const pIds = {};
      (existingP || []).forEach(p => { pIds[p.weekday + '-' + p.hour] = p.id; });
      const pUp = [];
      const pCr = [];
      for (let w = 0; w < 7; w++) {
        for (let h = 0; h < 24; h++) {
          const b = profileBuckets[w + '-' + h];
          const dayCount = b ? Object.keys(b.perDay).length : 0;
          const avg = b && dayCount ? +(b.total / dayCount).toFixed(2) : 0;
          const dayCounts = b ? Object.values(b.perDay) : [];
          const max = dayCounts.length ? Math.max(0, ...dayCounts) : 0;
          const rec = { weekday: w, hour: h, avg_order_count: avg, max_order_count: max, sample_count: dayCount };
          const id = pIds[w + '-' + h];
          if (id) pUp.push({ id, ...rec }); else pCr.push(rec);
        }
      }
      if (pUp.length) await base44.asServiceRole.entities.BusynessProfile.bulkUpdate(pUp);
      if (pCr.length) await base44.asServiceRole.entities.BusynessProfile.bulkCreate(pCr);
      profileWritten = pUp.length + pCr.length;
    }

    return Response.json({
      success: true,
      mode,
      ordersPulled,
      todayHoursWritten: hoursToWrite.length,
      profileWritten,
    });
  } catch (error) {
    console.error('syncSquareBusyness error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}