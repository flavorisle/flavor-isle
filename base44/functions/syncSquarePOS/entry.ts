import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { mapSquareStatus } from '../../shared/squareOrderStatus.ts';
import { lookupCustomersByIds, lookupCustomersByIdsDetailed, normalizePhone } from '../../shared/squareCustomer.ts';
import { getAccrualEventForOrder } from '../../shared/squareLoyalty.ts';
import { squareOrderFields } from '../../shared/squareOrderFields.ts';
import { todayChicago, chicagoParts } from '../../shared/busynessTime.ts';

const SQUARE_VERSION = '2026-09-16';
// Star Rewards lookups are one Square call each, so a run checks at most this
// many orders (newest first — Square returns them newest first).
const LOYALTY_LOOKUP_CAP = 50;

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
    const existingOrders = await base44.asServiceRole.entities.Order.list();
    const existingBySquareId = new Map();
    (existingOrders || []).forEach(o => {
      if (o.square_order_id) existingBySquareId.set(o.square_order_id, o);
    });

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
    for (const so of squareOrders) {
      // Skip Square orders that were pushed from our website (online orders
      // we created via createSquareOrder). These have metadata.order_source
      // = 'flavor-isle-website'. Without this, a duplicate Square order (from
      // the double-push race) gets re-imported as a ghost in-store order,
      // inflating counts and revenue.
      if (so.metadata?.order_source === 'flavor-isle-website') {
        continue;
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
      const customerEmail = linkedEmail || '';
      const customerName = sqName || 'Walk-In';
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
      if (!existing) {
        newOrders.push({
          order_number: so.reference_id || so.id.substring(0, 8),
          square_order_id: so.id,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: sqPhone,
          order_source: 'in_store',
          status: mapSquareStatus(so.state),
          items,
          ...orderFields,
          ...loyalty,
        });
      } else {
        // Relink an already-synced order once Square can resolve who paid it:
        // the old placeholder email, an empty phone, or an empty customer id.
        // Only fresh non-empty values are written; a real stored value is kept.
        const needsRelink =
          existing.customer_email === 'square-pos@flavorisle.com' ||
          !existing.customer_phone ||
          !existing.customer_id;
        if (needsRelink) {
          const patch: Record<string, any> = {};
          if (customerEmail && customerEmail !== existing.customer_email) patch.customer_email = customerEmail;
          if (sqPhone && !existing.customer_phone) patch.customer_phone = sqPhone;
          if (orderFields.normalized_phone && !existing.normalized_phone) patch.normalized_phone = orderFields.normalized_phone;
          if (orderFields.customer_id && !existing.customer_id) patch.customer_id = orderFields.customer_id;
          if (square_name && square_name !== existing.customer_name) patch.customer_name = square_name;
          if (loyalty.loyalty_accrued && !existing.loyalty_accrued) Object.assign(patch, loyalty);
          if (Object.keys(patch).length > 0) {
            updates.push(base44.asServiceRole.entities.Order.update(existing.id, patch));
          }
        }
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

    if (unresolvedCustomerIds.size > 0) {
      console.error('Square customer lookups returned no record for:', [...unresolvedCustomerIds].join(', '));
    }

    return Response.json({
      success: true,
      squareOrdersPulled: squareOrders.length,
      newOrders: newOrders.length,
      relinkedOrders: updates.length,
      unresolved_customers: unresolvedCustomerCount,
      ...(loyaltyUnauthorized ? { loyalty_lookup: 'unauthorized' } : {}),
      metricsUpdated: true
    });
  } catch (error) {
    console.error('Square sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});