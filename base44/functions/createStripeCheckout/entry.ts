import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { findBlock } from '../../shared/blockedContacts.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { items, orderType, customer, instructions, subtotal, deliveryFee, tax, total } = body;

    // Retired. This legacy endpoint charged the prices the caller sent (item
    // price, delivery fee, tax and total were all request-supplied) with no
    // catalog check, so a cart of one-cent line items could be checked out for
    // real. The live checkout pays through createPaymentIntent, which re-prices
    // the whole order from the catalog first.
    console.warn('createStripeCheckout: refused — endpoint retired');
    return Response.json({ error: 'This checkout is no longer available. Please refresh and order again.' }, { status: 410 });

    if (!items || items.length === 0) {
      return Response.json({ error: 'No items provided' }, { status: 400 });
    }

    // Blocked customers cannot complete an online checkout.
    if (await findBlock(base44, { phone: customer?.phone, email: customer?.email })) {
      return Response.json({ error: 'We are not able to take this order online. Please call the store at (270) 563-4618.' }, { status: 403 });
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
    const orderNumber = Date.now().toString().slice(-6);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      customer_email: customer.email,
      success_url: `${origin}/order-confirmation?session_id={CHECKOUT_SESSION_ID}&order_number=${orderNumber}`,
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

    // --- 2. Save Order entity to database (pending until webhook confirms payment) ---
    // Square order creation, kitchen printer alert, and confirmation email are
    // handled by the stripeWebhook function once `checkout.session.completed` fires.
    try {
      await base44.asServiceRole.entities.Order.create({
        order_number: orderNumber,
        order_type: orderType,
        status: 'pending',
        payment_status: 'pending',
        items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url || '', square_item_id: i.square_item_id || '' })),
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