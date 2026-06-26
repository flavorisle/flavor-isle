import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { items, orderType, customer, instructions, subtotal, deliveryFee, tax, total } = body;

    if (!items || items.length === 0) {
      return Response.json({ error: 'No items provided' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || 'https://flavor-isle.com';

    // --- 1. Create Stripe Checkout Session ---
    const lineItems = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          ...(item.image_url ? { images: [item.image_url] } : {}),
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    if (deliveryFee && deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Delivery Fee' },
          unit_amount: Math.round(deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    if (tax && tax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Sales Tax (6%)' },
          unit_amount: Math.round(tax * 100),
        },
        quantity: 1,
      });
    }

    const orderTypeLabel = orderType === 'pickup' ? 'Pickup' : orderType === 'delivery' ? 'Delivery' : 'Dine-In';

    // Generate order number
    const orderNumber = `FI-${Date.now().toString().slice(-6)}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customer.email,
      success_url: `${origin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        order_number: orderNumber,
        order_type: orderType,
        customer_name: customer.name,
        customer_phone: customer.phone || '',
        delivery_address: customer.address || '',
        table_number: customer.table || '',
        special_instructions: instructions || '',
      },
      payment_intent_data: {
        metadata: {
          order_type: orderTypeLabel,
          customer_name: customer.name,
          customer_email: customer.email,
        }
      },
      custom_text: {
        submit: {
          message: `Your ${orderTypeLabel} order will be ready in ${orderType === 'delivery' ? '35–50' : '15–25'} minutes. Thank you!`
        }
      }
    });

    // --- 2. Create Square Order ---
    let squareOrderId = null;
    try {
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

      const orderTypeMap = { pickup: 'PICKUP', delivery: 'DELIVERY', dine_in: 'EAT_IN' };

      const squareLineItems = items.map(item => ({
        name: item.name,
        quantity: String(item.quantity),
        base_price_money: { amount: Math.round(item.price * 100), currency: 'USD' },
      }));

      const squareOrder = {
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: locationId,
          reference_id: orderNumber,
          fulfillments: [{
            type: orderTypeMap[orderType] || 'PICKUP',
            state: 'PROPOSED',
            pickup_details: orderType === 'pickup' ? {
              recipient: { display_name: customer.name, phone_number: customer.phone || '' },
              pickup_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
              note: instructions || '',
            } : undefined,
            delivery_details: orderType === 'delivery' ? {
              recipient: {
                display_name: customer.name,
                phone_number: customer.phone || '',
                address: { address_line_1: customer.address || '' }
              },
              note: instructions || '',
            } : undefined,
          }],
          line_items: squareLineItems,
          metadata: {
            customer_email: customer.email,
            order_source: 'flavor-isle-website',
            stripe_session_id: session.id,
          },
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
        squareOrderId = sqData.order?.id;
        console.log('Square order created:', squareOrderId);
      } else {
        console.error('Square order error:', JSON.stringify(sqData));
      }
    } catch (sqError) {
      console.error('Square integration error (non-fatal):', sqError.message);
    }

    // --- 3. Save Order entity to database ---
    try {
      await base44.asServiceRole.entities.Order.create({
        order_number: orderNumber,
        order_type: orderType,
        status: 'pending',
        payment_status: 'pending',
        items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url || '' })),
        subtotal,
        tax,
        delivery_fee: deliveryFee || 0,
        total,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone || '',
        delivery_address: customer.address || '',
        special_instructions: instructions || '',
        table_number: customer.table || '',
        stripe_session_id: session.id,
        square_order_id: squareOrderId || '',
      });
      console.log('Order entity created:', orderNumber);
    } catch (dbError) {
      console.error('DB save error (non-fatal):', dbError.message);
    }

    return Response.json({ url: session.url, session_id: session.id, order_number: orderNumber });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});