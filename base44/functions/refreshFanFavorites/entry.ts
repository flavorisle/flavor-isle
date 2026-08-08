import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Aggregates the top 10 best-selling items across ALL Square order sources
// (online + in-store POS) from the last 60 days, then stamps the matching
// MenuItem records with is_fan_favorite + fan_favorite_rank so the Menu
// page can surface a "Fan Favorites" rail. Run weekly via workflow.

const SQUARE_VERSION = '2024-01-18';
const LOOKBACK_DAYS = 60;
const TOP_N = 10;
const MAX_ORDERS = 20000;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const connection = await base44.asServiceRole.connectors.getConnection('square');
    if (!connection || !connection.accessToken) {
      return Response.json({ error: 'Square not connected' }, { status: 400 });
    }
    const headers = {
      Authorization: `Bearer ${connection.accessToken}`,
      'Square-Version': SQUARE_VERSION,
      'Content-Type': 'application/json',
    };

    // Resolve location id
    let locationId = connection.connectionConfig && connection.connectionConfig.locationId;
    if (!locationId) {
      const locRes = await fetch('https://connect.squareup.com/v2/locations', { headers });
      const locData = await locRes.json();
      locationId = locData && locData.locations && locData.locations[0] && locData.locations[0].id;
    }
    if (!locationId) return Response.json({ error: 'Could not resolve Square location' }, { status: 500 });

    // Pull orders from the lookback window and tally line-item quantities
    const pullStart = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();
    const itemCounts = {};  // catalog_object_id -> total quantity
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
      for (const o of orders) {
        const items = o.line_items || [];
        for (const li of items) {
          const catId = li.catalog_object_id;
          if (!catId) continue;
          const qty = parseInt(li.quantity || '1', 10);
          itemCounts[catId] = (itemCounts[catId] || 0) + qty;
        }
      }
      ordersPulled += orders.length;
      cursor = data.cursor || null;
    } while (cursor && ordersPulled < MAX_ORDERS);

    // Rank item IDs by total quantity sold
    const ranked = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, TOP_N);

    const topIds = new Set(ranked.map(([id]) => id));
    const rankMap = {};
    ranked.forEach(([id, count], i) => { rankMap[id] = i + 1; });

    // Load all MenuItem records and stamp fan-favorite flags
    const allItems = await base44.asServiceRole.entities.MenuItem.list();
    const toUpdate = [];
    for (const item of allItems || []) {
      const sqId = item.square_item_id;
      const shouldBeFav = sqId && topIds.has(sqId);
      const shouldRank = shouldBeFav ? rankMap[sqId] : null;

      if (item.is_fan_favorite !== shouldBeFav || item.fan_favorite_rank !== shouldRank) {
        toUpdate.push({
          id: item.id,
          is_fan_favorite: shouldBeFav,
          fan_favorite_rank: shouldRank,
        });
      }
    }

    if (toUpdate.length > 0) {
      await base44.asServiceRole.entities.MenuItem.bulkUpdate(toUpdate);
    }

    return Response.json({
      success: true,
      ordersPulled,
      uniqueItems: Object.keys(itemCounts).length,
      topRanked: ranked.map(([id, count]) => ({ square_item_id: id, qty: count, rank: rankMap[id] })),
      menuItemsUpdated: toUpdate.length,
    });
  } catch (error) {
    console.error('refreshFanFavorites error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}