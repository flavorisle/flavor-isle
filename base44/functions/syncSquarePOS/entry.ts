import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { mapSquareStatus } from '../../shared/squareOrderStatus.ts';
import { lookupCustomersByIds, lookupCustomersByIdsDetailed, normalizePhone } from '../../shared/squareCustomer.ts';
import { getAccrualEventForOrder } from '../../shared/squareLoyalty.ts';
import { squareOrderFields } from '../../shared/squareOrderFields.ts';
import { loadCustomerProfileIndex, ensureCustomerProfile } from '../../shared/customerLink.ts';
import { todayChicago, chicagoParts } from '../../shared/busynessTime.ts';
import {
  isWebsiteSourced,
  orderNeedsRelink,
  newOrderIdentity,
  planOrderSync,
} from '../../shared/squareSyncPlan.ts';
import { acquireSyncLock, releaseSyncLock, SYNC_LEASE_MINUTES } from '../../shared/squareSyncLock.ts';

const SQUARE_VERSION = '2026-09-16';
// Star Rewards lookups are one Square call each, so a run checks at most this
// many orders (newest first — Square returns them newest first).
const LOYALTY_LOOKUP_CAP = 50;

Deno.serve(async (req) => {
  let base44: any = null;
  let leaseId = '';
  try {
    base44 = createClientFromRequest(req);

    // Issue #277 Part A: one sync run at a time. A run that finds a live lease
    // leaves every record untouched and reports skipped: 'locked'. The lease
    // expires after 15 minutes, so a crashed run can never jam the schedule.
    const lock = await acquireSyncLock(base44, crypto.randomUUID());
    if (!lock.acquired) {
      console.warn('Square sync skipped — another run holds the lease');
      return Response.json({
        success: true,
        skipped: 'locked',
        squareOrdersPulled: 0,
        newOrders: 0,
        relinkedOrders: 0,
        duplicates_removed: 0,
      });
    }
    leaseId = lock.leaseId || '';

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
    //
    // Issue #123 C4: a manual run may pass { days } to widen that window (the
    // one-time backfill uses 30 so the rest of the month can be relinked).
    // Scheduled runs send no body and keep the 7-day default.
    const body = await req.json().catch(() => ({}));
    const syncDays = Math.min(Math.max(Number(body?.days) || 7, 1), 30);
    const since = new Date(Date.now() - syncDays * 24 * 60 * 60 * 1000).toISOString();
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
    //
    // Issue #124: an unpaginated Order.list() returns only the first page, so a
    // pull larger than that page treated already-synced orders as new and
    // re-created them. Walk the whole register instead — 500 per page, following
    // the cursor until a short/empty page, with a 60-page (30,000 record) cap.
    const existingOrders: any[] = [];
    let existingCursor: string | null = null;
    for (let page = 0; page < 60; page++) {
      const res = await base44.asServiceRole.entities.Order.list({ limit: 500, cursor: existingCursor });
      const pageItems = res?.items || [];
      existingOrders.push(...pageItems);
      existingCursor = res?.next_cursor || null;
      if (pageItems.length < 500 || !existingCursor) break;
    }
    const existingBySquareId = new Map();
    (existingOrders || []).forEach(o => {
      if (o.square_order_id) existingBySquareId.set(o.square_order_id, o);
    });

    // One read of the customer directory for the whole run, so each order links
    // to the person it belongs to (or creates them) without a query per order.
    // Issue #135 C4: profileIndex carries byId too, so a newly created profile is
    // reused by every later order in the same run.
    const profileIndex = await loadCustomerProfileIndex(base44);

    // Resolve every Square customer referenced by the fetched orders in a
    // single batch so each POS order can carry the real name/email/phone.
    // Issue #123 C1: a card swipe or a loyalty sign-in at the counter does not
    // write the ticket's own customer_id, but Square's Tender objects carry the
    // paying card's customer, so those ids are collected here too.
    const customerIdSet = new Set();
    squareOrders.forEach(so => {
      if (so.customer_id) customerIdSet.add(so.customer_id);
      (so.tenders || []).forEach(tender => {
        if (tender.customer_id) customerIdSet.add(tender.customer_id);
      });
    });
    const { map: customerMap, error: customerLookupError } =
      await lookupCustomersByIdsDetailed(base44, [...customerIdSet]);

    // A customer lookup that genuinely failed is recorded, never swallowed:
    // otherwise every affected order silently degrades to Walk-In with no trace.
    if (customerLookupError) {
      try {
        await base44.asServiceRole.entities.SquareSyncLog.create({
          order_id: '(customer-lookup)',
          order_number: '(customer-lookup)',
          status: 'failed',
          error_message: String(customerLookupError).slice(0, 1000),
        });
      } catch (logErr) {
        console.error('Square customer lookup log failed:', (logErr as Error).message);
      }
    }

    // Issue #123 C2(c): a walk-in who keyed in their Star Rewards phone number
    // leaves no customer id on the ticket — only a loyalty event. The event's
    // account points at the Square customer. Accounts are cached per run so a
    // repeat customer costs one call.
    const loyaltyAccountCache = new Map();
    let loyaltyUnauthorized = false;
    const loyaltyCustomerIdForOrder = async (orderId: string) => {
      if (!orderId || loyaltyUnauthorized) return '';
      const headers = {
        'Authorization': `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_VERSION
      };
      try {
        const eventsRes = await fetch('https://connect.squareup.com/v2/loyalty/events/search', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: { filter: { order_filter: { order_id: orderId } } },
            limit: 30
          }),
          signal: AbortSignal.timeout(10000)
        });
        if (eventsRes.status === 403) {
          loyaltyUnauthorized = true;
          return '';
        }
        const eventsData = await eventsRes.json();
        if (!eventsRes.ok) {
          console.error('Square loyalty event search failed:', JSON.stringify(eventsData));
          return '';
        }
        const loyaltyAccountId = (eventsData.events || [])[0]?.loyalty_account_id || '';
        if (!loyaltyAccountId) return '';
        if (loyaltyAccountCache.has(loyaltyAccountId)) return loyaltyAccountCache.get(loyaltyAccountId);
        const accountRes = await fetch(`https://connect.squareup.com/v2/loyalty/accounts/${loyaltyAccountId}`, {
          headers,
          signal: AbortSignal.timeout(10000)
        });
        if (accountRes.status === 403) {
          loyaltyUnauthorized = true;
          return '';
        }
        const accountData = await accountRes.json();
        if (!accountRes.ok) {
          console.error('Square loyalty account lookup failed:', JSON.stringify(accountData));
          return '';
        }
        const customerId = accountData?.account?.customer_id || '';
        loyaltyAccountCache.set(loyaltyAccountId, customerId);
        return customerId;
      } catch (error) {
        // The loyalty step never fails a sync.
        console.error('Square loyalty lookup error:', (error as Error).message);
        return '';
      }
    };

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
    // Issue #123 C3: an id that produced no customer record is a failed lookup,
    // not a Walk-In — it is counted and logged, never silently degraded.
    let unresolvedCustomerCount = 0;
    let loyaltyLookups = 0;
    const unresolvedCustomerIds = new Set();

    // Issue #277 Part A: the in-flight guard. A SquareOrderClaim row is written
    // for a square_order_id BEFORE its Order row, so an overlapping run sees a
    // fresh claim and skips that order instead of creating a second copy. An
    // uncommitted claim older than the lease window is abandoned and retried.
    const runId = crypto.randomUUID();
    const FRESH_CLAIM_MS = SYNC_LEASE_MINUTES * 60 * 1000;
    const pendingClaims: any[] = [];
    const touchedSquareIds = new Set<string>();
    let websiteSkipped = 0;
    let inFlightSkipped = 0;

    // ONE read of the whole claim register for this run, so the in-flight check
    // costs nothing per order. A claim another run took within the lease window
    // means that order is being written right now — this run leaves it alone.
    const freshClaims = await base44.asServiceRole.entities.SquareOrderClaim.filter({ status: 'claimed' });
    const claimCutoff = Date.now() - FRESH_CLAIM_MS;
    const inFlightSquareIds = new Set(
      (freshClaims || [])
        .filter((claim: any) => new Date(claim?.claimed_at || 0).getTime() > claimCutoff)
        .map((claim: any) => claim.square_order_id)
    );

    for (const so of squareOrders) {
      // Skip Square orders that were pushed from our website (online orders
      // we created via createSquareOrder). These have metadata.order_source
      // = 'flavor-isle-website'. Without this, a duplicate Square order (from
      // the double-push race) gets re-imported as a ghost in-store order,
      // inflating counts and revenue.
      if (isWebsiteSourced(so)) {
        websiteSkipped += 1;
        continue;
      }

      if (!existingBySquareId.has(so.id)) {
        // Another run may already be writing this one — leave it to that run.
        if (inFlightSquareIds.has(so.id)) {
          inFlightSkipped += 1;
          continue;
        }
        // Claimed in one batch below, still before any Order row exists.
        pendingClaims.push({
          square_order_id: so.id,
          status: 'claimed',
          run_id: runId,
          claimed_at: new Date().toISOString(),
        });
      }

      // Issue #123 C2: the ticket's own customer first, then the paying card's
      // customer from its tender, then the customer behind this order's loyalty
      // event. A walk-in who pays by card or uses Star Rewards lands on their
      // profile; a cash walk-in with no loyalty stays Walk-In.
      const ticketCustomerId = so.customer_id || '';
      const tenderCustomerId = ticketCustomerId
        ? ''
        : ((so.tenders || []).find(tender => tender.customer_id)?.customer_id || '');
      let resolvedCustomerId = ticketCustomerId || tenderCustomerId;
      if (!resolvedCustomerId) {
        resolvedCustomerId = await loyaltyCustomerIdForOrder(so.id);
        if (resolvedCustomerId && !customerMap.has(resolvedCustomerId)) {
          // This customer was on no ticket, so the batch lookup never saw them.
          const extra = await lookupCustomersByIds(base44, [resolvedCustomerId]);
          extra.forEach((value, key) => customerMap.set(key, value));
        }
      }
      if ((ticketCustomerId || tenderCustomerId) && !customerMap.has(resolvedCustomerId)) {
        unresolvedCustomerCount += 1;
        unresolvedCustomerIds.add(resolvedCustomerId);
      }

      const cust = resolvedCustomerId ? customerMap.get(resolvedCustomerId) : null;
      const sqEmail = cust?.email || '';
      const sqPhone = cust?.phone || '';
      const sqName = cust?.name || '';
      // Prefer the online account email matched by phone so the POS order
      // lands in the customer's web history (RLS keys on customer_email =
      // user.email). Fall back to the Square email, then leave it empty — an
      // unknown email is never filled with an invented address.
      const linkedEmail = (sqPhone && phoneToEmail.get(normalizePhone(sqPhone))) || sqEmail || '';
      const items = (so.line_items || []).map(item => ({
        name: item.name || 'Item',
        quantity: item.quantity ? parseInt(item.quantity) : 1,
        price: item.gross_sales_money ? (item.gross_sales_money.amount / 100) : 0
      }));

      // Money, tender and fulfillment details read straight from the Square
      // order; empty/0 when Square has nothing to say.
      const { square_name, square_email: _squareEmail, square_phone: _squarePhone, ...orderFields } =
        squareOrderFields(so, cust);

      // Star Rewards: Square's own accrual event is the only record of the
      // points a POS order actually earned. Capped per run, newest first, and
      // never allowed to fail the sync.
      let loyalty = {};
      if (resolvedCustomerId && loyaltyLookups < LOYALTY_LOOKUP_CAP) {
        loyaltyLookups += 1;
        try {
          const event = await getAccrualEventForOrder(so.id);
          if (event) {
            const points = Number(
              event.accumulate_points?.points ?? event.accumulate_promotion_points?.points ?? 0,
            ) || 0;
            loyalty = {
              loyalty_account_id: event.loyalty_account_id || '',
              loyalty_points_earned: points,
              loyalty_accrued: true,
            };
          }
        } catch (loyaltyErr) {
          console.error(`Square loyalty lookup failed for order ${so.id}:`, (loyaltyErr as Error).message);
        }
      }

      const existing = existingBySquareId.get(so.id);
      // Issue #135 D2: Order.customer_id is a CustomerProfile id on every other
      // path, so Square's own customer id now rides in square_customer_id and the
      // profile is resolved (or created) here.
      const needsRelink = orderNeedsRelink(existing);
      let profileId = '';
      let profile: any = null;
      if (!existing || needsRelink) {
        profileId = await ensureCustomerProfile(base44, profileIndex, {
          name: sqName,
          phone: sqPhone,
          email: sqEmail,
        });
        profile = profileId ? profileIndex.byId.get(profileId) : null;
      }
      // A matched profile supplies what Square left out; nothing is invented.
      const profileEmail = profile?.email ? String(profile.email).trim() : '';
      const profilePhone = profile?.phone ? String(profile.phone).trim() : '';

      // Issue #277 Part A: the create/relink decision is the pure plan in
      // shared/squareSyncPlan.ts, so these rules can be tested on their own.
      const plan = planOrderSync({
        squareOrder: so,
        existing,
        squareName: sqName,
        squareEmail: sqEmail,
        squarePhone: sqPhone,
        profileEmail,
        profilePhone,
        profileId,
        orderFields,
        loyalty,
      });

      if (plan.action === 'create') {
        touchedSquareIds.add(so.id);
        newOrders.push({
          order_number: so.reference_id || so.id.substring(0, 8),
          square_order_id: so.id,
          ...newOrderIdentity({
            linkedEmail,
            profileEmail,
            squarePhone: sqPhone,
            profilePhone,
            profileId,
            squareName: sqName,
          }),
          order_source: 'in_store',
          // Register tickets land confirmed: the crew already has them in hand,
          // so nothing should wait on a confirm click (Wesley, Nov 9 2026).
          status: mapSquareStatus(so.state, { inStore: true }),
          items,
          ...orderFields,
          ...loyalty,
        });
      } else if (plan.action === 'relink') {
        // Relink an already-synced order once Square can resolve who paid it.
        // Only empty fields are filled; a real stored value is kept.
        touchedSquareIds.add(so.id);
        updates.push({ id: existing.id, ...plan.patch });
      }
    }

    // Issue #277 Part A: this run's claims are written in ONE call, before any
    // Order row exists. A second run reads them at its own start and skips those
    // square_order_ids instead of writing a second copy.
    const claimsBySquareId = new Map<string, string>();
    if (pendingClaims.length > 0) {
      const createdClaims = await base44.asServiceRole.entities.SquareOrderClaim.bulkCreate(pendingClaims);
      const claimRows = Array.isArray(createdClaims) ? createdClaims : (createdClaims?.items || []);
      claimRows.forEach((claim: any) => {
        if (claim?.square_order_id && claim?.id) claimsBySquareId.set(claim.square_order_id, claim.id);
      });
    }

    if (newOrders.length > 0) {
      const created = await base44.asServiceRole.entities.Order.bulkCreate(newOrders);
      const createdRows = Array.isArray(created) ? created : (created?.items || []);
      const orderIdBySquareId = new Map<string, string>();
      createdRows.forEach((row: any) => {
        if (row?.square_order_id && row?.id) orderIdBySquareId.set(row.square_order_id, row.id);
      });

      // Mark the claims committed with the Order row each one produced, so the
      // next run reads that square_order_id as done rather than in flight.
      const commits: any[] = [];
      for (const [squareOrderId, claimId] of claimsBySquareId.entries()) {
        let orderId = orderIdBySquareId.get(squareOrderId) || '';
        if (!orderId) {
          // bulkCreate did not hand the row back — read it rather than guess.
          const rows = await base44.asServiceRole.entities.Order.filter({ square_order_id: squareOrderId });
          orderId = (rows || [])[0]?.id || '';
        }
        if (!orderId) continue;
        commits.push({
          id: claimId,
          status: 'committed',
          order_id: orderId,
          committed_at: new Date().toISOString(),
        });
      }
      if (commits.length > 0) {
        try {
          await base44.asServiceRole.entities.SquareOrderClaim.bulkUpdate(commits);
        } catch (claimError) {
          console.error('Square claim commit failed:', (claimError as Error).message);
        }
      }
    }
    // Issue #277: relinks go out as one bulkUpdate per 500 rows instead of one
    // entity call per order. A wide window could otherwise write hundreds of
    // orders in a minute and exhaust the entity-update rate limit.
    for (let i = 0; i < updates.length; i += 500) {
      await base44.asServiceRole.entities.Order.bulkUpdate(updates.slice(i, i + 500));
    }

    // Issue #277 Part A: re-count the square_order_ids this run touched. If two
    // runs ever slipped through, the oldest Order row is kept and the newer
    // copies are removed — but ONLY a row carrying this exact square_order_id.
    // Read in chunks of 100 ids so the whole sweep costs a few calls, not one
    // per order.
    let duplicatesRemoved = 0;
    const touched = [...touchedSquareIds];
    for (let i = 0; i < touched.length; i += 100) {
      const chunk = touched.slice(i, i + 100);
      const rows = await base44.asServiceRole.entities.Order.filter({ square_order_id: { $in: chunk } });
      const groups = new Map<string, any[]>();
      (rows || []).forEach((row: any) => {
        // Never group anything that does not share an exactly equal id.
        if (!row?.square_order_id || !chunk.includes(row.square_order_id)) return;
        const group = groups.get(row.square_order_id) || [];
        group.push(row);
        groups.set(row.square_order_id, group);
      });

      for (const [squareOrderId, group] of groups.entries()) {
        if (group.length < 2) continue;
        const ordered = group.slice().sort((a: any, b: any) =>
          new Date(a.created_date || 0).getTime() - new Date(b.created_date || 0).getTime() ||
          String(a.id).localeCompare(String(b.id))
        );
        const [keep, ...extra] = ordered;
        for (const dup of extra) {
          if (!dup.square_order_id || dup.square_order_id !== squareOrderId) continue;
          await base44.asServiceRole.entities.Order.delete(dup.id);
          duplicatesRemoved += 1;
          try {
            await base44.asServiceRole.entities.SquareSyncLog.create({
              order_id: dup.id,
              order_number: dup.order_number || '',
              square_order_id: squareOrderId,
              status: 'skipped',
              customer_name: dup.customer_name || '',
              customer_email: dup.customer_email || '',
              total: dup.total ?? 0,
              error_message: `Duplicate Order for the same Square order removed (kept ${keep.id}). Issue #277 Part A.`,
            });
          } catch (logError) {
            console.error('Square duplicate log failed:', (logError as Error).message);
          }
        }
      }
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

    // Issue #277: 24 hours in two batched calls instead of 24 separate writes,
    // so the metrics step can never be what exhausts the entity-update budget.
    const metricUpdates = [];
    const metricCreates = [];
    for (let hour = 0; hour < 24; hour++) {
      const count = hourlyMap[hour] || 0;
      const level = count >= 8 ? 'Expecting a Short Wait' : count >= 5 ? 'A Little Busy' : 'Running Smooth';

      if (metricsMap[hour]) {
        metricUpdates.push({ id: metricsMap[hour], order_count: count, busyness_level: level });
      } else {
        metricCreates.push({
          hour,
          date: today,
          order_count: count,
          busyness_level: level,
          source: 'square_pos'
        });
      }
    }
    if (metricUpdates.length > 0) {
      await base44.asServiceRole.entities.HourlyMetrics.bulkUpdate(metricUpdates);
    }
    if (metricCreates.length > 0) {
      await base44.asServiceRole.entities.HourlyMetrics.bulkCreate(metricCreates);
    }

    if (unresolvedCustomerIds.size > 0) {
      console.error('Square customer lookups returned no record for:', [...unresolvedCustomerIds].join(', '));
    }

    return Response.json({
      success: true,
      squareOrdersPulled: squareOrders.length,
      newOrders: newOrders.length,
      relinkedOrders: updates.length,
      duplicates_removed: duplicatesRemoved,
      skipped: websiteSkipped + inFlightSkipped,
      skipped_detail: { website: websiteSkipped, in_flight: inFlightSkipped },
      unresolved_customers: unresolvedCustomerCount,
      ...(loyaltyUnauthorized ? { loyalty_lookup: 'unauthorized' } : {}),
      metricsUpdated: true
    });
  } catch (error) {
    console.error('Square sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    // The lease is always handed back, so the next run starts straight away
    // instead of waiting for the 15-minute expiry.
    await releaseSyncLock(base44, leaseId);
  }
});