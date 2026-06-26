import Stripe from 'npm:stripe@14.25.0';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { items, orderType, customer, instructions, subtotal, deliveryFee, tax, total } = body;

    if (!items || items.length === 0) {
      return Response.json({ error: 'No items provided' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const origin = req.headers.get('origin') || 'https://flavor-isle.com';

    // Build line items for each menu item
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

    // Add delivery fee as a line item if applicable
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

    // Add tax as a line item
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

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customer.email,
      success_url: `${origin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
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

    return Response.json({ url: session.url, session_id: session.id });
  } catch (error) {
    console.error('Stripe checkout error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});