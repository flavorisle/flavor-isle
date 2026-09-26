import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { mapSquareStatus } from '../../shared/squareOrderStatus.ts';
import { lookupCustomersByIds, normalizePhone } from '../../shared/squareCustomer.ts';
import { todayChicago, chicagoParts } from '../../shared/busynessTime.ts';

const PLACEHOLDER_EMAIL = 'square-pos@flavorisle.com';
const SQUARE_VERSION = '2026-09-16';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const connection = await base44.asServiceRole.connectors.getConnection('square');

    if (!connection?.accessToken) {
      return Response.json({ error: 'Square not connected' }, { status: 400 });
    }

    // Resolve the Square location id — the connection's merchantId is NOT the
    // location id. Without location_ids the SearchOrders call returns nothing.
    let locationId = connection.connectionConfig?.locationId;
    if (!locationId) {
      const locRes = await fetch('https://connect.squareup.com/v2/locations', {
        headers: { 'Authorization': `Bearer ${connection.accessToken}`, 'Square-Version': SQUARE_VERSION }
      });
      const locData = await locRes.json();
      locationId = locData.locations?.[0]?.id;
    }
    if (!locationId) throw new Error('Could not resolve Square location ID');

    // Fetch Square orders from the last 7 days via SearchOrders (the correct
    // endpoint — the old code POSTed to /v2/orders, which is the create-order
    // endpoint and silently returned no orders). The wider window lets us both
    // sync new POS orders and relink recently-synced ones whose customer had
    // no resolvable email on the first pass.
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const squareOrders = [];
    let cursor = undefined;
    // Page through all results so a busy week doesn't leave orders behind.
    for (let page = 0; page < 5; page++) {
      const res = await fetch('https://connect.squareup.com/v2/orders/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': SQUARE_VERSION
        },
        body: JSON.stringify({
          location_ids: [locationId],
          query: {
            filter: {
              date_time_filter: {
                created_at: { start_at: since }
              }
            },
            sort: { sort_field: 'CREATED_AT', sort_order: 'DESC' }
          },
          limit: 500,
          ...(cursor ? { cursor } : {})
        })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Square SearchOrders error:', JSON.stringify(data));
        return Response.json({ error: 'Square API error', details: data }, { status: 500 });
      }
      if (data.orders) squareOrders.push(...data.orders);
      cursor = data.cursor;
      if (!cursor || (data.orders || []).length === 0) break;
    }

    // Index existing orders by square_order_id so we can skip already-synced
    // orders and relink ones still carrying the placeholder email.
    const existingOrders = await base44.asServiceRole.entities.Order.list();
    const existingBySquareId = new Map();
    (existingOrders || []).forEach(o => {
      if (o.square_order_id) existingBySquareId.set(o.square_order_id, o);
    });

    // Resolve every Square customer referenced by the fetched orders in a
    // single batch so each POS order can carry the real name/email/phone.
    const customerIdSet = new Set();
    squareOrders.forEach(so => { if (so.customer_id) customerIdSet.add(so.customer_id); });
    const customerMap = await lookupCustomersByIds(base44, [...customerIdSet]);

    // Build a phone -> online-account-email map from CustomerProfile. The
    // loyalty program keys on phone, so this is the reliable join between a
    // Square POS customer and the customer's web account — even when their
    // Square email differs from (or is absent on) their online account.
    const profiles = await base44.asServiceRole.entities.CustomerProfile.list();
    const phoneToEmail = new Map();
    (profiles || []).forEach(p => {
      if (p.phone && p.email) {
        phoneToEmail.set(normalizePhone(p.phone), p.email);
      }
    });

    const newOrders = [];
    const updates = [];
    for (const so of squareOrders) {
      // Skip Square orders that were pushed from our website (online orders
      // we created via createSquareOrder). These have metadata.order_source
      // = 'flavor-isle-website'. Without this, a duplicate Square order (from
      // the double-push race) gets re-imported as a ghost in-store order,
      // inflating counts and revenue.
      if (so.metadata?.order_source === 'flavor-isle-website') {
        continue;
      }

      const cust = so.customer_id ? customerMap.get(so.customer_id) : null;
      const sqEmail = cust?.email || '';
      const sqPhone = cust?.phone || '';
      const sqName = cust?.name || '';
      // Prefer the online account email matched by phone so the POS order
      // lands in the customer's web history (RLS keys on customer_email =
      // user.email). Fall back to the Square email, then the placeholder.
      const linkedEmail = (sqPhone && phoneToEmail.get(normalizePhone(sqPhone))) || sqEmail || '';
      const customerEmail = linkedEmail || PLACEHOLDER_EMAIL;
      const customerName = sqName || (so.customer_id ? 'POS Customer' : 'Walk-In');
      const items = (so.line_items || []).map(item => ({
        name: item.name || 'Item',
        quantity: item.quantity ? parseInt(item.quantity) : 1,
        price: item.gross_sales_money ? (item.gross_sales_money.amount / 100) : 0
      }));
      const total = so.total_money ? (so.total_money.amount / 100) : 0;

      const existing = existingBySquareId.get(so.id);
      if (!existing) {
        newOrders.push({
          order_number: so.reference_id || so.id.substring(0, 8),
          square_order_id: so.id,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: sqPhone,
          order_type: 'dine_in',
          order_source: 'in_store',
          status: mapSquareStatus(so.state),
          items,
          total,
          subtotal: total,
          tax: so.total_tax_money ? (so.total_tax_money.amount / 100) : 0,
          payment_status: 'paid'
        });
      } else if (linkedEmail && existing.customer_email === PLACEHOLDER_EMAIL) {
        // Relink a previously-synced POS order now that we can resolve the
        // customer to a real online account.
        updates.push(base44.asServiceRole.entities.Order.update(existing.id, {
          customer_email: customerEmail,
          customer_phone: sqPhone || existing.customer_phone || '',
          customer_name: customerName,
        }));
      }
    }

    if (newOrders.length > 0) {
      await base44.asServiceRole.entities.Order.bulkCreate(newOrders);
    }
    if (updates.length > 0) {
      await Promise.all(updates);
    }

    // Calculate hourly metrics for today in store-local (America/Chicago) time
    // so the date + hour keys match the Chicago-based busyness profiles. The
    // Deno runtime is UTC, so raw getHours()/toISOString() would shift every
    // order's hour by the UTC offset and mis-key the metrics.
    const today = todayChicago().dateKey;
    const allOrders = await base44.asServiceRole.entities.Order.list();
    const todayOrders = (allOrders || []).filter(o => {
      const orderDate = chicagoParts(o.created_date).dateKey;
      return orderDate === today;
    });

    // Group by hour
    const hourlyMap = {};
    todayOrders.forEach(order => {
      const hour = chicagoParts(order.created_date).hour;
      hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
    });

    // Update or create hourly metrics
    const existingMetrics = await base44.asServiceRole.entities.HourlyMetrics.filter({ date: today });
    const metricsMap = {};
    (existingMetrics || []).forEach(m => {
      metricsMap[m.hour] = m.id;
    });

    for (let hour = 0; hour < 24; hour++) {
      const count = hourlyMap[hour] || 0;
      const level = count >= 8 ? 'Expecting a Short Wait' : count >= 5 ? 'A Little Busy' : 'Running Smooth';

      if (metricsMap[hour]) {
        await base44.asServiceRole.entities.HourlyMetrics.update(metricsMap[hour], {
          order_count: count,
          busyness_level: level
        });
      } else {
        await base44.asServiceRole.entities.HourlyMetrics.create({
          hour,
          date: today,
          order_count: count,
          busyness_level: level,
          source: 'square_pos'
        });
      }
    }

    return Response.json({
      success: true,
      squareOrdersPulled: squareOrders.length,
      newOrders: newOrders.length,
      relinkedOrders: updates.length,
      metricsUpdated: true
    });
  } catch (error) {
    console.error('Square sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});