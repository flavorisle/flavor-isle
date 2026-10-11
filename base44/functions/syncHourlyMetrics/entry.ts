import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { chicagoParts } from '../../shared/busynessTime.ts';
import { maintenanceCaller } from '../../shared/maintenanceGate.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Owner-only maintenance. No workflow calls this any more (the hourly busyness
    // workflow is archived), so an anonymous caller has no legitimate reason to
    // reach it and is refused outright. A signed-in caller must be an admin and a
    // server-to-server caller must present the app relay key.
    const caller = await maintenanceCaller(base44, req, body);
    if (!caller.ok) return caller.error;

    // Get all orders from past 24 hours (all statuses to show actual throughput)
    const allOrders = await base44.asServiceRole.entities.Order.list();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentOrders = (allOrders || []).filter(o =>
      new Date(o.created_date) > oneDayAgo
    );

    // Group by hour and date
    const metrics = {};
    recentOrders.forEach(order => {
      const chicago = chicagoParts(order.created_date);
      const dateStr = chicago.dateKey;
      const hour = chicago.hour;
      const key = `${dateStr}-${hour}`;

      if (!metrics[key]) {
        metrics[key] = { date: dateStr, hour, count: 0 };
      }
      metrics[key].count += 1;
    });

    // Upsert hourly metrics
    for (const [key, data] of Object.entries(metrics)) {
      const busynessLevel = data.count >= 8 ? 'Expecting a Short Wait' :
                           data.count >= 5 ? 'A Little Busy' :
                           'Running Smooth';

      const existing = await base44.asServiceRole.entities.HourlyMetrics.filter({
        date: data.date,
        hour: data.hour
      });

      if (existing && existing.length > 0) {
        await base44.asServiceRole.entities.HourlyMetrics.update(existing[0].id, {
          order_count: data.count,
          busyness_level: busynessLevel
        });
      } else {
        await base44.asServiceRole.entities.HourlyMetrics.create({
          date: data.date,
          hour: data.hour,
          order_count: data.count,
          busyness_level: busynessLevel
        });
      }
    }

    return Response.json({ success: true, metricsUpdated: Object.keys(metrics).length });
  } catch (error) {
    console.error('Hourly metrics sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}