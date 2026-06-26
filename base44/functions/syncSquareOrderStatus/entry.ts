import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Maps Square fulfillment/order states to our app's order statuses
function mapSquareStateToStatus(squareOrder) {
  const fulfillment = squareOrder.fulfillments?.[0];
  const fulfillmentState = fulfillment?.state;
  const orderState = squareOrder.state;

  if (orderState === 'COMPLETED') return 'completed';
  if (orderState === 'CANCELED') return 'cancelled';

  switch (fulfillmentState) {
    case 'PROPOSED': return 'pending';
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
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: customerEmail,
          from_name: 'Flavor Isle',
          subject: `🍔 Your order #${orderNum} is being prepared!`,
          body: `Hi ${customerName},\n\nGreat news! Our kitchen has started preparing your order #${orderNum}.\n\nYou'll get another update when it's ready.\n\nThanks for choosing Flavor Isle!\n103 N Main St, Smiths Grove, KY 42171\n(280) 563-4618`
        });
        notified++;
      }

      if (newStatus === 'ready') {
        const orderType = order.order_type;
        const readyMsg = orderType === 'delivery'
          ? `Your order is on its way! Our driver is heading to you now.`
          : orderType === 'dine_in'
          ? `Your order is ready at your table! Enjoy your meal.`
          : `Your order is ready for pickup! Come on in — we'll have it waiting for you at the counter.`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: customerEmail,
          from_name: 'Flavor Isle',
          subject: `✅ Order #${orderNum} is ready!`,
          body: `Hi ${customerName},\n\n${readyMsg}\n\nOrder #${orderNum}\n\nFlavor Isle\n103 N Main St, Smiths Grove, KY 42171\n(280) 563-4618`
        });
        notified++;
      }

      if (newStatus === 'completed') {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: customerEmail,
          from_name: 'Flavor Isle',
          subject: `Thank you for visiting Flavor Isle! 🙌`,
          body: `Hi ${customerName},\n\nYour order #${orderNum} is marked complete. We hope you enjoyed your meal!\n\nWe'd love to see you again soon.\n\nFlavor Isle\n103 N Main St, Smiths Grove, KY 42171\n(280) 563-4618`
        });
        notified++;
      }
    }

    return Response.json({ checked: squareOrders.length, updated, notified });
  } catch (error) {
    console.error('syncSquareOrderStatus error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});