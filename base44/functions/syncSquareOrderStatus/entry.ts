import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendSmashieSms, smashieSmsTemplates } from '../../shared/sendSmashieSms.ts';
import { sendOrderPreparingEmail, sendOrderReadyEmail, sendOrderCompletedEmail } from '../../shared/sendOrderEmails.ts';
import { sendPushToEmail } from '../../shared/sendPush.ts';
import { getSmashieSettings } from '../../shared/smashieSettings.ts';
import { getLiveBusyness } from '../../shared/liveBusyness.ts';
import { accrueForOrder, hasAccrualEventForOrder } from '../../shared/squareLoyalty.ts';
import { checkSmsConsent, markSmsSent } from '../../shared/smsConsent.ts';

// Maps Square fulfillment/order states to our app's order statuses.
// Fulfillment is checked FIRST so that "staff marked it ready" (fulfillment
// COMPLETED) maps to `ready` even if the order-level state already flipped to
// COMPLETED in the same Square update — otherwise the `ready` email is skipped.
function mapSquareStateToStatus(squareOrder) {
  const fulfillment = squareOrder.fulfillments?.[0];
  const fulfillmentState = fulfillment?.state;
  const orderState = squareOrder.state;

  if (orderState === 'CANCELED') return 'cancelled';

  switch (fulfillmentState) {
    case 'PROPOSED': return 'confirmed';
    case 'RESERVED': return 'confirmed';
    case 'PREPARED': return 'preparing';
    case 'COMPLETED':
      // Fulfillment done = ready for pickup/delivery. Only escalate to
      // `completed` when the ORDER itself is also closed out.
      return orderState === 'COMPLETED' ? 'completed' : 'ready';
    default: break;
  }

  // Fallback on order-level state
  if (orderState === 'COMPLETED') return 'completed';
  if (orderState === 'OPEN') return 'confirmed';
  return null;
}

// Returns the ordered list of status milestones between (prev, new] so the
// sync can send catch-up emails for any states the polling interval skipped.
// e.g. confirmed → completed should fire preparing, ready, then completed.
function missedMilestones(prevStatus, newStatus) {
  const order = ['confirmed', 'preparing', 'ready', 'completed'];
  const startIdx = order.indexOf(prevStatus);
  const endIdx = order.indexOf(newStatus);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return [];
  return order.slice(startIdx + 1, endIdx + 1);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get Square connection
    const connection = await base44.asServiceRole.connectors.getConnection('square');
    const accessToken = connection.accessToken;
    // Resolve actual location ID (merchantId is NOT the location ID — fetch it)
    let locationId = connection.connectionConfig?.locationId;
    if (!locationId) {
      const locRes = await fetch('https://connect.squareup.com/v2/locations', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Square-Version': '2026-09-16' }
      });
      const locData = await locRes.json();
      locationId = locData.locations?.[0]?.id;
    }
    if (!locationId) throw new Error('Could not resolve Square location ID');

    // Fetch orders from the last 48 hours that are active
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const squareRes = await fetch('https://connect.squareup.com/v2/orders/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2026-09-16',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location_ids: [locationId],
        query: {
          filter: {
            date_time_filter: {
              updated_at: { start_at: since }
            },
            state_filter: {
              states: ['OPEN', 'COMPLETED', 'CANCELED']
            }
          },
          sort: { sort_field: 'UPDATED_AT', sort_order: 'DESC' }
        },
        limit: 100
      })
    });

    const squareData = await squareRes.json();
    if (!squareRes.ok) {
      console.error('Square search error:', JSON.stringify(squareData));
      return Response.json({ error: 'Square API error', details: squareData }, { status: 500 });
    }

    let squareOrders = squareData.orders || [];

    // Paginate: fetch a second page if the first was full (busy restaurants
    // can have 100+ order updates in 48 hours, and in-store POS orders can
    // push online orders out of the first page).
    if (squareData.cursor && squareOrders.length >= 100) {
      const page2Res = await fetch('https://connect.squareup.com/v2/orders/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': '2026-09-16',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_ids: [locationId],
          query: {
            filter: {
              date_time_filter: { updated_at: { start_at: since } },
              state_filter: { states: ['OPEN', 'COMPLETED', 'CANCELED'] }
            },
            sort: { sort_field: 'UPDATED_AT', sort_order: 'DESC' }
          },
          limit: 100,
          cursor: squareData.cursor
        })
      });
      const page2Data = await page2Res.json();
      if (page2Res.ok && page2Data.orders) {
        squareOrders = squareOrders.concat(page2Data.orders);
      }
    }

    console.log(`Found ${squareOrders.length} Square orders to check`);

    const smashieSettings = await getSmashieSettings(base44);

    // Fetch recent Order entities ONCE and index by square_order_id, instead
    // of one filter() call per Square order — the per-order calls were
    // exhausting the entity API rate limit every 5-minute run.
    const recentOrders = await base44.asServiceRole.entities.Order.list('-created_date', 1000);
    const orderBySquareId = new Map();
    (recentOrders || []).forEach(o => {
      if (o.square_order_id) orderBySquareId.set(o.square_order_id, o);
    });

    let updated = 0;
    let notified = 0;
    const pendingUpdates = [];
    const completedThisRun = [];
    // Cap loyalty accrual retries per run — each needs a Square loyalty ledger
    // lookup, and bursting through dozens at once trips Square's rate limit.
    // Spreads the backfill across scheduled runs instead.
    let loyaltyRetriesThisRun = 0;
    const LOYALTY_RETRY_CAP = 3;

    for (const sqOrder of squareOrders) {
      const newStatus = mapSquareStateToStatus(sqOrder);
      if (!newStatus) continue;

      // Look up the matching Order entity from the in-memory index
      const order = orderBySquareId.get(sqOrder.id);
      if (!order) continue;

      // Loyalty accrual retry — online orders paid via Stripe sometimes miss
      // Star Rewards points because the Square order isn't in a computed state
      // the instant payment lands. Retry here for any paid online order that
      // hasn't been marked accrued. Safe: we first check Square's loyalty
      // ledger for an existing ACCUMULATE_POINTS event on this order — if one
      // exists, the order was already credited and we just mark it, never
      // re-accruing (so already-credited orders, even from before this flag
      // existed, are backfilled without double-awarding).
      if (
        order.order_source === 'online' &&
        order.payment_status === 'paid' &&
        order.square_order_id &&
        order.customer_email &&
        !order.loyalty_accrued &&
        loyaltyRetriesThisRun < LOYALTY_RETRY_CAP
      ) {
        loyaltyRetriesThisRun++;
        try {
          const alreadyAccrued = await hasAccrualEventForOrder(order.square_order_id);
          if (alreadyAccrued) {
            await base44.asServiceRole.entities.Order.update(order.id, { loyalty_accrued: true });
            console.log(`Loyalty already accrued for order ${order.order_number} — marked`);
          } else {
            await accrueForOrder({ squareOrderId: order.square_order_id, email: order.customer_email, phone: order.customer_phone });
            await base44.asServiceRole.entities.Order.update(order.id, { loyalty_accrued: true });
            console.log(`Loyalty accrual retry succeeded for order ${order.order_number}`);
          }
        } catch (retryErr) {
          console.error(`Loyalty accrual retry failed for order ${order.order_number}:`, retryErr.message);
        }
      }

      // Only update if status actually changed
      if (order.status === newStatus) continue;

      const prevStatus = order.status;

      // Stage the status update; applied in a single bulkUpdate after the loop
      pendingUpdates.push({ id: order.id, status: newStatus });
      updated++;
      console.log(`Order ${order.id}: ${prevStatus} → ${newStatus}`);

      // Track orders transitioning to completed so we can sync customer
      // profile stats after the bulkUpdate (bulkUpdate skips entity triggers,
      // so the "Sync Customer Profile Stats" workflow never fires from here).
      if (newStatus === 'completed') {
        completedThisRun.push(order.id);
      }

      // Send email/push/SMS for the new status AND any intermediate milestones
      // the polling interval skipped (e.g. confirmed → completed should also
      // fire preparing + ready notifications so the customer is never left
      // wondering).
      const customerEmail = order.customer_email;
      const customerName = order.customer_name;
      const orderNum = order.order_number || order.id.slice(-6).toUpperCase();

      // Never notify placeholder addresses used for in-store POS / walk-in
      // orders — those aren't real customers and just burn email credits.
      const isPlaceholderEmail = /@flavorisle\.(com|local)$/i.test(customerEmail) || order.order_source === 'in_store';
      if (!customerEmail || isPlaceholderEmail) continue;

      const milestones = missedMilestones(prevStatus, newStatus);
      // Transactional SMS requires explicit active transactional consent for
      // this order's phone AND the global admin toggle. STOP suppresses all.
      let canTxSms = false;
      if (smashieSettings.sms_status_updates_enabled && order.customer_phone) {
        try {
          canTxSms = (await checkSmsConsent(base44, order.customer_phone, 'transactional')).ok;
        } catch (e) {
          canTxSms = false;
        }
      }
      for (const milestone of milestones) {
        if (milestone === 'preparing') {
          await sendOrderPreparingEmail(order, base44);
          notified++;
          // Live wait for the push body — same number the email and site show.
          let pushWait = '';
          try {
            const live = await getLiveBusyness(base44);
            if (!live.isClosed && live.estimated_wait_min > 0) {
              pushWait = ` Expect ~${live.estimated_wait_min} min — kitchen is ${live.busyness_level.toLowerCase()}.`;
            }
          } catch (e) {
            console.error('live wait for push failed:', e.message);
          }
          if (canTxSms) {
            await sendSmashieSms(order.customer_phone, smashieSmsTemplates.preparing(order));
            await markSmsSent(base44, order.customer_phone, 'transactional');
          }
          await sendPushToEmail(base44, customerEmail, {
            title: '🍔 Order on the grill',
            body: `Hey ${customerName}, order #${orderNum} just hit the kitchen.${pushWait} We'll ping you the second it's ready!`,
            url: '/order-status',
            tag: `order-${order.id}`,
          });
        }

        if (milestone === 'ready') {
          await sendOrderReadyEmail(order, base44);
          notified++;
          if (canTxSms) {
            await sendSmashieSms(order.customer_phone, smashieSmsTemplates.ready(order));
            await markSmsSent(base44, order.customer_phone, 'transactional');
          }
          await sendPushToEmail(base44, customerEmail, {
            title: '✅ Order ready!',
            body: order.order_type === 'delivery'
              ? `Order #${orderNum} is ready and on its way!`
              : `Order #${orderNum} is ready for pickup. See you soon!`,
            url: '/order-status',
            tag: `order-${order.id}`,
          });
        }

        if (milestone === 'completed') {
          await sendOrderCompletedEmail(order, base44);
          notified++;
          if (canTxSms) {
            await sendSmashieSms(order.customer_phone, smashieSmsTemplates.completed(order));
            await markSmsSent(base44, order.customer_phone, 'transactional');
          }
          await sendPushToEmail(base44, customerEmail, {
            title: 'Thanks for rolling with us! 🙌',
            body: `Order #${orderNum} is all wrapped. Hope you ate good — see you again soon!`,
            url: '/order-status',
            tag: `order-${order.id}`,
          });
        }
      }
    }

    if (pendingUpdates.length > 0) {
      await base44.asServiceRole.entities.Order.bulkUpdate(pendingUpdates);
    }

    // Sync customer profile stats for orders that just completed. The entity
    // trigger workflow doesn't fire on bulkUpdate (bulk methods skip side
    // effects), so we invoke the sync directly here.
    for (const completedOrderId of completedThisRun) {
      try {
        await base44.functions.invoke('syncCustomerProfileStats', {
          order_id: completedOrderId,
        });
      } catch (syncErr) {
        console.error(`Profile sync failed for order ${completedOrderId}:`, syncErr.message);
      }
    }

    return Response.json({ checked: squareOrders.length, updated, notified, profiles_synced: completedThisRun.length });
  } catch (error) {
    console.error('syncSquareOrderStatus error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});