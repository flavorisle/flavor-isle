import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Aggregates the top 10 best-selling items across ALL Square order sources
// (online + in-store POS) from COMPLETED, PAID orders in the last 60 days,
// then stamps the matching visible MenuItem records with is_fan_favorite +
// fan_favorite_rank so the homepage "Fan Favorites" rail can surface them.
//
// Correctness rules (per approved Sep 22 proposal):
//  - Only COMPLETED orders with at least one tender (paid) are counted.
//  - Online orders synced to Square appear here as single Square orders and
//    are counted once; the app Order entity is NOT read, so there is no
//    double count of online orders.
//  - Line-item catalog_object_id values (ITEM_VARIATION ids for
//    multi-variation items, or ITEM ids) are resolved to their parent ITEM
//    id via the Catalog API, then quantities are aggregated across variations.
//  - is_hidden=true MenuItems are EXCLUDED before ranking.
//  - Ranks 1..N (N <= 10) are assigned only to qualifying public items that
//    actually sold; no rankings are fabricated.
//  - On any Square API failure, previous rankings are RETAINED (nothing is
//    updated) and an error is returned — success is never claimed.
//  - The admin gate is soft: scheduled workflow invocations run without a
//    user session and proceed as the service role; manual invocations still
//    require an admin.

const SQUARE_VERSION = '2026-09-16';
const LOOKBACK_DAYS = 60;
const TOP_N = 10;
const MAX_ORDERS = 20000;
const CATALOG_BATCH = 1000;

export default async function (req) {
  const base44 = createClientFromRequest(req);

  // Soft admin gate — workflow invocations have no user session.
  try {
    const user = await base44.auth.me();
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }
  } catch (_e) {
    // No user session (scheduled workflow) — proceed as service role.
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

  // Resolve Square location id.
  let locationId = connection.connectionConfig && connection.connectionConfig.locationId;
  if (!locationId) {
    try {
      const locRes = await fetch('https://connect.squareup.com/v2/locations', { headers });
      const locData = await locRes.json();
      locationId = locData && locData.locations && locData.locations[0] && locData.locations[0].id;
    } catch (e) {
      console.error('refreshFanFavorites: location resolve failed:', e.message);
      return Response.json({ error: 'Could not resolve Square location', details: e.message }, { status: 500 });
    }
  }
  if (!locationId) return Response.json({ error: 'Could not resolve Square location' }, { status: 500 });

  // Pull orders from the lookback window and tally line-item quantities by
  // their catalog_object_id (a variation id for multi-variation items, or the
  // item id for single-variation items).
  const pullStart = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();
  const lineCounts = {}; // catalog_object_id -> total quantity
  let ordersPulled = 0;
  let completedPaidOrders = 0;
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
    if (!res.ok) {
      // Square failure — retain previous ranking, do not claim success.
      console.error('refreshFanFavorites: Square order search failed, retaining previous ranking:', JSON.stringify(data));
      return Response.json({ error: 'Square order search failed; previous ranking retained', details: data }, { status: 502 });
    }

    for (const o of (data.orders || [])) {
      const isCompleted = o.state === 'COMPLETED';
      const isPaid = Array.isArray(o.tenders) && o.tenders.length > 0;
      if (!isCompleted || !isPaid) continue;
      completedPaidOrders++;
      for (const li of (o.line_items || [])) {
        const catId = li.catalog_object_id;
        if (!catId) continue; // ad-hoc line item, no catalog mapping
        const qty = parseInt(li.quantity || '1', 10);
        lineCounts[catId] = (lineCounts[catId] || 0) + qty;
      }
    }
    ordersPulled += (data.orders || []).length;
    cursor = data.cursor || null;
  } while (cursor && ordersPulled < MAX_ORDERS);

  // Resolve every catalog_object_id to its parent ITEM id. Line items
  // reference ITEM_VARIATION ids (multi-variation) or ITEM ids; MenuItem
  // records store the parent ITEM id in square_item_id.
  const catIds = Object.keys(lineCounts);
  const parentMap = {}; // catalog_object_id -> parent item id (self if ITEM)
  for (let i = 0; i < catIds.length; i += CATALOG_BATCH) {
    const chunk = catIds.slice(i, i + CATALOG_BATCH);
    try {
      const catRes = await fetch('https://connect.squareup.com/v2/catalog/batch-retrieve', {
        method: 'POST', headers, body: JSON.stringify({ object_ids: chunk }),
      });
      const catData = await catRes.json();
      if (!catRes.ok) {
        console.error('refreshFanFavorites: catalog batch-retrieve failed, retaining previous ranking:', JSON.stringify(catData));
        return Response.json({ error: 'Square catalog lookup failed; previous ranking retained', details: catData }, { status: 502 });
      }
      for (const obj of (catData.objects || [])) {
        if (obj.type === 'ITEM_VARIATION' && obj.item_variation_data) {
          parentMap[obj.id] = obj.item_variation_data.item_id;
        } else if (obj.type === 'ITEM') {
          parentMap[obj.id] = obj.id;
        }
      }
    } catch (e) {
      console.error('refreshFanFavorites: catalog batch-retrieve threw, retaining previous ranking:', e.message);
      return Response.json({ error: 'Square catalog lookup failed; previous ranking retained', details: e.message }, { status: 502 });
    }
  }

  // Aggregate quantities by parent item id (sum across variations).
  const parentCounts = {}; // parent item id -> total quantity
  for (const [catId, qty] of Object.entries(lineCounts)) {
    const parentId = parentMap[catId];
    if (!parentId) continue; // unmapped (ad-hoc or missing catalog object)
    parentCounts[parentId] = (parentCounts[parentId] || 0) + qty;
  }

  // Load all MenuItem records, EXCLUDE hidden items BEFORE ranking, and map
  // by square_item_id (dedup: keep the first visible item per square_item_id).
  const allItems = await base44.asServiceRole.entities.MenuItem.list();
  const visibleBySquareId = new Map();
  for (const item of (allItems || [])) {
    if (item.is_hidden) continue;
    if (!item.square_item_id) continue;
    if (!visibleBySquareId.has(item.square_item_id)) {
      visibleBySquareId.set(item.square_item_id, item);
    }
  }

  // Resolve the parent catalog item names, including sold items without a
  // matching public MenuItem, before grouping the two approved buckets.
  const names = {};
  const parentIds = Object.keys(parentCounts);
  for (let i = 0; i < parentIds.length; i += CATALOG_BATCH) {
    const response = await fetch('https://connect.squareup.com/v2/catalog/batch-retrieve', {
      method: 'POST', headers,
      body: JSON.stringify({ object_ids: parentIds.slice(i, i + CATALOG_BATCH) }),
    });
    const result = await response.json();
    if (!response.ok) return Response.json({ error: 'Square item lookup failed; previous ranking retained', details: result }, { status: 502 });
    for (const obj of (result.objects || [])) if (obj.type === 'ITEM') names[obj.id] = obj.item_data?.name || '';
  }
  const drinkNames = new Set(['l 20oz drink', 's 14oz drink', 'coke product', 'sweet tea', 'classic drinks']);
  const regular = [];
  let shakeQty = 0;
  let drinkQty = 0;
  for (const [sqId, qty] of Object.entries(parentCounts)) {
    const name = (names[sqId] || visibleBySquareId.get(sqId)?.name || '').trim();
    const normalized = name.toLowerCase();
    if (normalized.includes('add deluxe')) continue;
    if (normalized.includes('milkshake')) { shakeQty += qty; continue; }
    if (drinkNames.has(normalized)) { drinkQty += qty; continue; }
    const item = visibleBySquareId.get(sqId);
    if (item) regular.push({ item, sqId, qty, name });
  }
  const classic = (allItems || []).find((item) => !item.is_hidden && item.name?.trim().toLowerCase() === 'classic drinks');
  if (drinkQty && classic) regular.push({ item: classic, sqId: classic.square_item_id, qty: drinkQty, name: 'Classic Drinks' });
  if (shakeQty) regular.push({ item: null, sqId: null, qty: shakeQty, name: 'Shake Isle — 22 Flavors', bucket: 'shake' });
  const rankedVisible = regular.sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name)).slice(0, TOP_N);
  const ranked = rankedVisible.map((r, i) => ({
    rank: i + 1, name: r.name, qty: r.qty, bucket: r.bucket || null,
    menu_item_id: r.item?.id || null, square_item_id: r.sqId,
  }));
  const dryRun = (await req.clone().json().catch(() => ({}))).dryRun === true;
  if (dryRun) return Response.json({ success: true, preview: true, ordersPulled, completedPaidOrders, ranked });

  const newFavIds = new Set(rankedVisible.filter((r) => r.item).map((r) => r.item.id));
  const rankById = {};
  rankedVisible.forEach((r, i) => { if (r.item) rankById[r.item.id] = i + 1; });

  // Stamp fan-favorite flags. Previously-favorite items that no longer qualify
  // are cleared; new qualifiers are set; unchanged items are skipped.
  const toUpdate = [];
  let cleared = 0;
  for (const item of (allItems || [])) {
    const shouldBeFav = newFavIds.has(item.id);
    const shouldRank = shouldBeFav ? rankById[item.id] : null;
    if (item.is_fan_favorite !== shouldBeFav || item.fan_favorite_rank !== shouldRank) {
      toUpdate.push({ id: item.id, is_fan_favorite: shouldBeFav, fan_favorite_rank: shouldRank });
      if (!shouldBeFav) cleared++;
    }
  }
  if (toUpdate.length > 0) {
    await base44.asServiceRole.entities.MenuItem.bulkUpdate(toUpdate);
  }
  const snapshots = await base44.asServiceRole.entities.FanFavoriteSnapshot.list();
  const snapshot = { shake_rank: ranked.find((r) => r.bucket === 'shake')?.rank || null, ranked, lookback_days: LOOKBACK_DAYS, computed_at: new Date().toISOString() };
  if (snapshots[0]) await base44.asServiceRole.entities.FanFavoriteSnapshot.update(snapshots[0].id, snapshot);
  else await base44.asServiceRole.entities.FanFavoriteSnapshot.create(snapshot);

  return Response.json({
    success: true,
    ordersPulled,
    completedPaidOrders,
    uniqueLineItemObjects: catIds.length,
    uniqueParentItems: Object.keys(parentCounts).length,
    eligibleRankedItems: rankedVisible.length,
    ranked: rankedVisible.map((r) => ({
      rank: rankById[r.item.id],
      menu_item_id: r.item.id,
      name: r.item.name,
      square_item_id: r.sqId,
      qty: r.qty,
    })),
    menuItemsUpdated: toUpdate.length,
    cleared,
  });
}