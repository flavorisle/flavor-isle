import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { customer_name, customer_phone, items, order_type, delivery_address, special_instructions, total } = body;

    if (!customer_name || !items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Missing required fields: customer_name, items' }, { status: 400 });
    }
    if (order_type === 'delivery' && !delivery_address) {
      return Response.json({ error: 'A delivery address is required for delivery orders' }, { status: 400 });
    }

    const itemSubtotal = items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0,
    );
    const subtotal = Number(total) > 0 ? Number(total) : itemSubtotal;
    const tax = Math.round(subtotal * 0.06 * 100) / 100;
    const finalTotal = Math.round((subtotal + tax) * 100) / 100;
    const orderNumber = 'PH' + Date.now().toString().slice(-6);

    // Log to Base44 database
    const order = await base44.asServiceRole.entities.Order.create({
      order_number: orderNumber,
      order_type: order_type || 'pickup',
      status: 'confirmed',
      items: items,
      subtotal,
      tax,
      total: finalTotal,
      customer_name: customer_name,
      customer_phone: customer_phone || '',
      customer_email: 'phone-order@flavorisle.com',
      delivery_address: delivery_address || '',
      special_instructions: special_instructions || '',
      payment_status: 'pending',
    });

    // Send to Square
    try {
      const connection = await base44.asServiceRole.connectors.getConnection('square');
      const accessToken = connection.accessToken;

      let locationId = connection.connectionConfig?.locationId;
      if (!locationId) {
        const locRes = await fetch('https://connect.squareup.com/v2/locations', {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Square-Version': '2024-01-18' }
        });
        const locData = await locRes.json();
        locationId = locData.locations?.[0]?.id;
      }

      if (locationId) {
        const lineItems = items.map(item => ({
          name: item.name,
          quantity: String(item.quantity),
          base_price_money: { amount: Math.round((item.price || 0) * 100), currency: 'USD' },
        }));

        // Format note for kitchen
        let pickupNote = `CALL IN — ${(order_type || 'pickup').toUpperCase()}\n${customer_name}\n${customer_phone || ''}`;
        if (order_type === 'delivery') pickupNote += `\nDELIVER TO: ${delivery_address}`;

        const squareOrder = {
          idempotency_key: crypto.randomUUID(),
          order: {
            location_id: locationId,
            fulfillments: [{
              type: 'PICKUP',
              state: 'PROPOSED',
              pickup_details: {
                recipient: { display_name: customer_name, phone_number: customer_phone || '' },
                pickup_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
                note: pickupNote + (special_instructions ? '\n\nNOTES: ' + special_instructions : ''),
              },
            }],
            line_items: lineItems,
            metadata: { order_source: 'phone-order', order_number: orderNumber, order_type: order_type || 'pickup' },
          },
        };

        const sqRes = await fetch('https://connect.squareup.com/v2/orders', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Square-Version': '2024-01-18',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(squareOrder),
        });

        const sqData = await sqRes.json();
        if (sqRes.ok) {
          console.log('Phone order sent to Square:', sqData.order?.id);
        } else {
          console.error('Square error for phone order:', JSON.stringify(sqData));
        }
      }
    } catch (squareErr) {
      console.error('Square integration error:', squareErr.message);
    }

    return Response.json({
      success: true,
      order_number: orderNumber,
      order_id: order.id,
      subtotal,
      tax,
      total: finalTotal,
      delivery_address: delivery_address || null,
      message: `Phone order #${orderNumber} logged successfully for ${customer_name}. Final total: $${finalTotal.toFixed(2)}`,
    });
  } catch (error) {
    console.error('logPhoneOrder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}