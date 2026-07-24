import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendSmashieSms, smashieSmsTemplates } from '../../shared/sendSmashieSms.ts';
import { sendOrderStatusEmail } from '../../shared/sendOrderEmails.ts';

// Maps Square fulfillment/order states to our app's order statuses
function mapSquareStateToStatus(squareOrder) {
  const fulfillment = squareOrder.fulfillments?.[0];
  const fulfillmentState = fulfillment?.state;
  const orderState = squareOrder.state;

  if (orderState === 'COMPLETED') return 'completed';
  if (orderState === 'CANCELED') return 'cancelled';

  switch (fulfillmentState) {
    case 'PROPOSED': return 'confirmed';
    case 'RESERVED': return 'confirmed';
    case 'PREPARED': return 'preparing';
    case 'COMPLETED': return 'ready';
    default: break;
  }

  // Fallback on order-level state
  if (orderState === 'OPEN') return 'confirmed';
  return null;
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
        limit: 50
      })
    });

    const squareData = await squareRes.json();
    if (!squareRes.ok) {
      console.error('Square search error:', JSON.stringify(squareData));
      return Response.json({ error: 'Square API error', details: squareData }, { status: 500 });
    }

    const squareOrders = squareData.orders || [];
    console.log(`Found ${squareOrders.length} Square orders to check`);

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

      // Send email notifications for key transitions
      const customerEmail = order.customer_email;
      const customerName = order.customer_name;
      const orderNum = order.order_number || order.id.slice(-6).toUpperCase();

      if (!customerEmail) continue;

      if (newStatus === 'preparing') {
        await sendOrderStatusEmail(
          customerEmail,
          `🍔 Order #${orderNum} is on the grill`,
          `Hey ${customerName},\n\nOrder #${orderNum} just hit the kitchen — the crew's cooking it up fresh right now. 🔥\n\nWe'll hit you up the second it's ready.\n\n— Smashie & The Flavor Isle Team 🍔`
        );
        notified++;
      }

      if (newStatus === 'ready') {
        const orderType = order.order_type;
        const itemSummary = (order.items || [])
          .map(i => `${i.name || 'Item'}${i.quantity > 1 ? ` x${i.quantity}` : ''}`)
          .join(', ');
        const totalStr = `$${(order.total || 0).toFixed(2)}`;
        const locationLine = orderType === 'delivery'
          ? `Delivery To: ${order.delivery_address || 'on file'}`
          : orderType === 'dine_in'
          ? `Table: ${order.table_number || 'N/A'} — Flavor Isle`
          : `Pickup Location: Flavor Isle — Smiths Grove`;
        const closingLine = orderType === 'delivery'
          ? `It's rolling your way right now — enjoy! 🚗`
          : orderType === 'dine_in'
          ? `It's headed to your table — dig in! 🍔`
          : `Pull up whenever you're ready — we'll have it hot and waiting.`;

        await sendOrderStatusEmail(
          customerEmail,
          `✅ Order #${orderNum} is ready!`,
          `Hey ${customerName},\n\nIt's go time — your Flavor Isle order is hot, fresh, and ready. 🔥\n\nORDER READY · #${orderNum}\nItems: ${itemSummary || '—'}\nTotal: ${totalStr}\n${locationLine}\n\n${closingLine}\n\n— Smashie & The Flavor Isle Team 🍔`
        );
        notified++;

        // Ready-for-pickup SMS so the customer can head out the moment it's done.
        if (order.customer_phone) {
          await sendSmashieSms(order.customer_phone, smashieSmsTemplates.ready(order));
        }
      }

      if (newStatus === 'completed') {
        await sendOrderStatusEmail(
          customerEmail,
          `Thanks for rolling with us! 🙌`,
          `Hey ${customerName},\n\nOrder #${orderNum} is all wrapped. Hope you ate good — that's what we're here for. 🍔\n\nWe'd love to see you back soon, fam.\n\n— Smashie & The Flavor Isle Team`
        );
        notified++;
      }
    }

    return Response.json({ checked: squareOrders.length, updated, notified });
  } catch (error) {
    console.error('syncSquareOrderStatus error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});