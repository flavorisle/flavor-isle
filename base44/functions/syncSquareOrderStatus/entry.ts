import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendOrderStatusSms } from '../../shared/sendOrderStatusSms.ts';
import { settleCashPickupPayment } from '../../shared/settleCashPickupPayment.ts';
import { sendOrderPreparingEmail, sendOrderReadyEmail, sendOrderCompletedEmail } from '../../shared/sendOrderEmails.ts';
import { sendPushToEmail } from '../../shared/sendPush.ts';
import { getSmashieSettings } from '../../shared/smashieSettings.ts';
import { getLiveBusyness } from '../../shared/liveBusyness.ts';
import { accrueForOrder, hasAccrualEventForOrder } from '../../shared/squareLoyalty.ts';
import { grantCompletedWebOrderBonuses } from '../../shared/webOrderLoyaltyBonuses.ts';

import { settleSquarePhonePayment } from '../../shared/settleSquarePhonePayment.ts';
import { requireAdmin } from '../../shared/requireAdmin.ts';

import { mapSquareFulfillmentStatus, advanceOrderStatus } from '../../shared/orderTrackingStatus.ts';
import { CANCELABLE_STATUSES, mirrorPosCancellation, mirrorPosRefunds, listRecentSquareRefunds } from '../../shared/posOrderCancellation.ts';

// Returns the ordered list of status milestones between (prev, new] so the
// sync can send catch-up emails for any states the polling interval skipped.
// e.g. confirmed → completed should fire preparing, ready, then completed.
function missedMilestones(prevStatus, newStatus) {
  const order = ['confirmed', 'preparing', 'ready', 'completed'];
  const startIdx = order.indexOf(prevStatus);
  const endIdx = order.indexOf(newStatus);
  if ((startIdx === -1 && prevStatus !== 'pending') || endIdx === -1 || endIdx <= startIdx) return [];
  return order.slice(startIdx + 1, endIdx + 1);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.error) return auth.error;

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
      if (o.payment_provider === 'square' && o.square_checkout_order_id) orderBySquareId.set(o.square_checkout_order_id, o);
    });

    let updated = 0;
    let notified = 0;
    const completedThisRun = [];
    // Cap loyalty accrual retries per run — each needs a Square loyalty ledger
    // lookup, and bursting through dozens at once trips Square's rate limit.
    // Spreads the backfill across scheduled runs instead.
    let loyaltyRetriesThisRun = 0;
    const LOYALTY_RETRY_CAP = 3;

    for (const sqOrder of squareOrders) {
      let newStatus = mapSquareFulfillmentStatus(sqOrder);
      if (!newStatus) continue;

      // Look up the matching Order entity from the in-memory index
      let order = orderBySquareId.get(sqOrder.id);
      if (!order) continue;
      if (order.pay_cash_on_pickup) {
        order = await settleCashPickupPayment(base44, order, false, sqOrder);
      } else if (order.payment_provider === 'square' && order.payment_status !== 'paid') {
        order = await settleSquarePhonePayment(base44, order, sqOrder);
        // Checkout creation is not confirmation: wait for an actual completed payment.
        if (order.payment_status !== 'paid') continue;
      }

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
            if (order.direct_web_rewards_v2 === true) await accrueForOrder({ squareOrderId: order.square_order_id, email: order.customer_email, phone: order.customer_phone, directWebOrderId: order.id, skipAccrual: true });
            await base44.asServiceRole.entities.Order.update(order.id, { loyalty_accrued: true });
            console.log(`Loyalty already accrued for order ${order.order_number} — marked`);
          } else {
            await accrueForOrder({ squareOrderId: order.square_order_id, email: order.customer_email, phone: order.customer_phone, enroll: order.loyalty_opt_in === true, directWebOrderId: order.direct_web_rewards_v2 === true ? order.id : undefined });
            await base44.asServiceRole.entities.Order.update(order.id, { loyalty_accrued: true });
            console.log(`Loyalty accrual retry succeeded for order ${order.order_number}`);
          }
        } catch (retryErr) {
          console.error(`Loyalty accrual retry failed for order ${order.order_number}:`, retryErr.message);
        }
      }

      // The crew cancelled this ticket at the register. Mirror it here and tell
      // the customer, so nobody has to come onto the website to cancel it again.
      if (newStatus === 'cancelled' && CANCELABLE_STATUSES.includes(order.status)) {
        try {
          const { notified: told } = await mirrorPosCancellation(base44, order);
          if (told) notified++;
          updated++;
          console.log(`Order ${order.id}: ${order.status} → cancelled (at the register)`);
        } catch (cancelError) {
          console.error(`Could not mirror the register cancellation for order ${order.order_number}:`, cancelError.message);
        }
        continue;
      }

      // A staff update must not be rolled backwards by stale Square state.
      newStatus = advanceOrderStatus(order.status, newStatus);
      if (newStatus === 'completed' && order.payment_status === 'paid') {
        try {
          await grantCompletedWebOrderBonuses(base44, { ...order, status: newStatus }, recentOrders);
        } catch (bonusErr) {
          console.error(`Web Star Rewards bonus failed for order ${order.order_number}:`, bonusErr.message);
        }
      }
      if (order.status === newStatus) continue;

      const prevStatus = order.status;

      // Persist before notifications: an email/SMS failure must never hide Ready.
      // Keep bulk semantics so unrelated entity triggers do not fire here.
      await base44.asServiceRole.entities.Order.bulkUpdate([{ id: order.id, status: newStatus }]);
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

      const milestones = missedMilestones(prevStatus, newStatus);
      // Record each text outcome independently of email/push success.
      if (order.order_source !== 'in_store') {
        for (const milestone of milestones) {
          try {
            await sendOrderStatusSms(base44, order, milestone, { settings: smashieSettings });
          } catch (smsError) {
            console.error(`Order ${order.order_number} ${milestone} SMS log failed:`, smsError.message);
          }
        }
      }
      // Placeholder email addresses do not suppress a customer's text history.
      const isPlaceholderEmail = /@flavorisle\.(com|local)$/i.test(customerEmail) || order.order_source === 'in_store';
      if (!customerEmail || isPlaceholderEmail) continue;
      try {
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

          await sendPushToEmail(base44, customerEmail, {
            title: 'Thanks for rolling with us! 🙌',
            body: `Order #${orderNum} is all wrapped. Hope you ate good — see you again soon!`,
            url: '/order-status',
            tag: `order-${order.id}`,
          });
        }
      }
      } catch (notificationError) {
        console.error(`Status saved for order ${order.order_number}, but notification failed:`, notificationError.message);
      }
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

    // Register refunds. A refund rung up on the POS leaves the Square order
    // COMPLETED, so it never surfaced here: the money went back, the card still
    // read paid, and an order still on the board had to be cancelled again on
    // the website. Read Square's refunds for the same window and settle up.
    let refunds = { recorded: 0, cancelled: 0, notified: 0 };
    try {
      const squareRefunds = await listRecentSquareRefunds(accessToken, locationId, since);
      refunds = await mirrorPosRefunds(base44, orderBySquareId, squareRefunds);
    } catch (refundError) {
      console.error('Refund mirror failed:', refundError.message);
    }

    return Response.json({ checked: squareOrders.length, updated, notified, profiles_synced: completedThisRun.length, refunds });
  } catch (error) {
    console.error('syncSquareOrderStatus error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}