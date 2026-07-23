import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { items, orderType, orderNumber, customer, instructions, total } = body;

    const orderTypeLabel = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' }[orderType] || 'Pickup';
    const displayName = orderNumber
      ? `${customer.name} (#${orderNumber}) ${orderTypeLabel}`
      : `${customer.name} ${orderTypeLabel}`;

    // Get Square access token via connector
    const connection = await base44.asServiceRole.connectors.getConnection('square');
    const accessToken = connection.accessToken;

    // Resolve actual location ID
    let locationId = connection.connectionConfig?.locationId;
    if (!locationId) {
      const locRes = await fetch('https://connect.squareup.com/v2/locations', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Square-Version': '2024-01-18' }
      });
      const locData = await locRes.json();
      locationId = locData.locations?.[0]?.id;
    }
    if (!locationId) return Response.json({ error: 'Could not resolve Square location ID' }, { status: 500 });

    const idempotencyKey = crypto.randomUUID();

    const lineItems = items.map(item => ({
      name: item.name || item.catalog_object_id,
      quantity: String(item.quantity || 1),
      base_price_money: {
        amount: Math.round((item.price || item.base_price_money?.amount / 100 || 0) * 100),
        currency: 'USD',
      },
      catalog_object_id: item.catalog_object_id,
    }));

    // Format note based on order type for kitchen printing
    let pickupNote = '';
    if (orderType === 'pickup') {
      pickupNote = `PICKUP\n${customer.name}\n${customer.phone || ''}`;
    } else if (orderType === 'delivery') {
      pickupNote = `DELIVERY\n${customer.name}\n${customer.address || ''}\n${customer.phone || ''}`;
    } else if (orderType === 'dine_in') {
      pickupNote = `DINE IN\nTable: ${customer.table || 'N/A'}\n${customer.name}`;
    }

    const squareOrder = {
      idempotency_key: idempotencyKey,
      order: {
        location_id: locationId,
        fulfillments: [{
          type: 'PICKUP',
          state: 'PROPOSED',
          pickup_details: {
            recipient: {
              display_name: displayName,
              phone_number: customer.phone || '',
            },
            pickup_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
            note: pickupNote + (instructions ? '\n\nNOTES: ' + instructions : ''),
          },
        }],
        line_items: lineItems,
        metadata: {
          customer_email: customer.email,
          order_source: 'flavor-isle-website',
          order_type: orderType,
        },
      },
    };

    const response = await fetch('https://connect.squareup.com/v2/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-01-18',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(squareOrder),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Square error:', JSON.stringify(data));
      return Response.json({ error: 'Square order creation failed', details: data }, { status: 500 });
    }

    console.log('Square order created:', data.order?.id);
    return Response.json({ order_id: data.order?.id, order: data.order });
  } catch (error) {
    console.error('Square order error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});