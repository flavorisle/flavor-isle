import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendSmashieSms, smashieSmsTemplates } from '../../shared/sendSmashieSms.ts';
import { sendOrderStatusEmail, sendOrderReadyEmail } from '../../shared/sendOrderEmails.ts';
import { sendPushToEmail } from '../../shared/sendPush.ts';
import { getSmashieSettings } from '../../shared/smashieSettings.ts';

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
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Square-Version': '2024-01-18' }
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
        'Square-Version': '2024-01-18',
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
          'Square-Version': '2024-01-18',
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

    let updated = 0;
    let notified = 0;

    for (const sqOrder of squareOrders) {
      const newStatus = mapSquareStateToStatus(sqOrder);
      if (!newStatus) continue;

      // Find matching Order entity by square_order_id
      const matches = await base44.asServiceRole.entities.Order.filter({ square_order_id: sqOrder.id });
      if (!matches || matches.length === 0) continue;

      const order = matches[0];

      // Only update if status actually changed
      if (order.status === newStatus) continue;

      const prevStatus = order.status;

      // Update the order status
      await base44.asServiceRole.entities.Order.update(order.id, { status: newStatus });
      updated++;
      console.log(`Order ${order.id}: ${prevStatus} → ${newStatus}`);

      // Send email/push/SMS for the new status AND any intermediate milestones
      // the polling interval skipped (e.g. confirmed → completed should also
      // fire preparing + ready notifications so the customer is never left
      // wondering).
      const customerEmail = order.customer_email;
      const customerName = order.customer_name;
      const orderNum = order.order_number || order.id.slice(-6).toUpperCase();

      if (!customerEmail) continue;

      const milestones = missedMilestones(prevStatus, newStatus);
      for (const milestone of milestones) {
        if (milestone === 'preparing') {
          await sendOrderStatusEmail(
            customerEmail,
            `🍔 Order #${orderNum} is on the grill`,
            `Hey ${customerName},\n\nOrder #${orderNum} just hit the kitchen — the crew's cooking it up fresh right now. 🔥\n\nWe'll hit you up the second it's ready.\n\n— Smashie & The Flavor Isle Team 🍔`
          );
          notified++;
          if (smashieSettings.sms_status_updates_enabled && order.customer_phone) {
            await sendSmashieSms(order.customer_phone, smashieSmsTemplates.preparing(order));
          }
          await sendPushToEmail(base44, customerEmail, {
            title: '🍔 Order on the grill',
            body: `Hey ${customerName}, order #${orderNum} just hit the kitchen. We'll ping you the second it's ready!`,
            url: '/account',
            tag: `order-${order.id}`,
          });
        }

        if (milestone === 'ready') {
          await sendOrderReadyEmail(order);
          notified++;
          if (smashieSettings.sms_status_updates_enabled && order.customer_phone) {
            await sendSmashieSms(order.customer_phone, smashieSmsTemplates.ready(order));
          }
          await sendPushToEmail(base44, customerEmail, {
            title: '✅ Order ready!',
            body: order.order_type === 'delivery'
              ? `Order #${orderNum} is ready and on its way!`
              : `Order #${orderNum} is ready for pickup. See you soon!`,
            url: '/account',
            tag: `order-${order.id}`,
          });
        }

        if (milestone === 'completed') {
          await sendOrderStatusEmail(
            customerEmail,
            `Thanks for rolling with us! 🙌`,
            `Hey ${customerName},\n\nOrder #${orderNum} is all wrapped. Hope you ate good — that's what we're here for. 🍔\n\nWe'd love to see you back soon, fam.\n\n— Smashie & The Flavor Isle Team`
          );
          notified++;
          if (smashieSettings.sms_status_updates_enabled && order.customer_phone) {
            await sendSmashieSms(order.customer_phone, smashieSmsTemplates.completed(order));
          }
          await sendPushToEmail(base44, customerEmail, {
            title: 'Thanks for rolling with us! 🙌',
            body: `Order #${orderNum} is all wrapped. Hope you ate good — see you again soon!`,
            url: '/account',
            tag: `order-${order.id}`,
          });
        }
      }
    }

    return Response.json({ checked: squareOrders.length, updated, notified });
  } catch (error) {
    console.error('syncSquareOrderStatus error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});