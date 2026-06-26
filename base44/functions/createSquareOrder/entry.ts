import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { items, orderType, customer, instructions, total } = body;

    // Get Square access token via connector
    const connection = await base44.asServiceRole.connectors.getConnection('square');
    const accessToken = connection.accessToken;
    const merchantId = connection.connectionConfig?.merchantId;

    const idempotencyKey = crypto.randomUUID();

    const orderTypeMap = {
      pickup: 'PICKUP',
      delivery: 'DELIVERY',
      dine_in: 'EAT_IN',
    };

    const lineItems = items.map(item => ({
      name: item.name,
      quantity: String(item.quantity),
      base_price_money: {
        amount: Math.round(item.price * 100),
        currency: 'USD',
      },
    }));

    const squareOrder = {
      idempotency_key: idempotencyKey,
      order: {
        location_id: connection.connectionConfig?.locationId || merchantId,
        fulfillments: [{
          type: orderTypeMap[orderType] || 'PICKUP',
          state: 'PROPOSED',
          pickup_details: orderType === 'pickup' ? {
            recipient: {
              display_name: customer.name,
              phone_number: customer.phone || '',
            },
            note: instructions || '',
          } : undefined,
          delivery_details: orderType === 'delivery' ? {
            recipient: {
              display_name: customer.name,
              phone_number: customer.phone || '',
              address: {
                address_line_1: customer.address || '',
              }
            },
            note: instructions || '',
          } : undefined,
        }],
        line_items: lineItems,
        metadata: {
          customer_email: customer.email,
          order_source: 'flavor-isle-website',
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