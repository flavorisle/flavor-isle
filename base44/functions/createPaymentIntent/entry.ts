import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { items, orderType, pickupMethod, customer, instructions, subtotal, deliveryFee, tax, total, tip, discount, redemptionId, promoApplied, scheduledFor, estimatedTime, vehicle, stripeCustomerId } = body;

    if (!items || items.length === 0) {
      return Response.json({ error: 'No items provided' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');

    const orderNumber = Date.now().toString().slice(-6);
    const amountCents = Math.round(total * 100);

    // When a signed-in customer has saved cards (or wants to save this card),
    // attach the Stripe Customer so saved payment methods can be charged and
    // the card can be reused after this payment (setup_future_usage).
    const piParams = {
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        order_number: orderNumber,
        order_type: orderType,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone || '',
        delivery_address: customer.address || '',
        table_number: customer.table || '',
        special_instructions: instructions || '',
      },
    };
    // Attach the Stripe Customer when present so saved payment methods can be
    // charged. We intentionally do NOT set setup_future_usage here — new cards
    // are only saved when the customer explicitly opts in after payment.
    if (stripeCustomerId) {
      piParams.customer = stripeCustomerId;
    }
    const paymentIntent = await stripe.paymentIntents.create(piParams);

    // Save order entity as pending
    try {
      await base44.asServiceRole.entities.Order.create({
        order_number: orderNumber,
        order_type: orderType,
        ...(orderType === 'pickup' ? { pickup_method: pickupMethod === 'curbside' ? 'curbside' : 'counter' } : {}),
        // Vehicle captured at checkout for curbside orders — the crew knows
        // what car to look for before the customer even taps "I'm Here".
        ...(vehicle && (vehicle.color || vehicle.make || vehicle.model) ? {
          arrival_details: {
            car_color: vehicle.color || '',
            car_make: vehicle.make || '',
            car_model: vehicle.model || '',
          },
        } : {}),
        status: 'pending',
        payment_status: 'pending',
        items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url || '', selectedModifiers: i.selectedModifiers || [], catalog_object_id: i.catalog_object_id || '', isBuildShake: !!i.isBuildShake, deluxeLabel: i.deluxeLabel || '', deluxeToppings: i.deluxeToppings || [] })),
        subtotal,
        tax,
        delivery_fee: deliveryFee || 0,
        tip: tip || 0,
        discount: discount || 0,
        redemption_id: redemptionId || '',
        promo_applied: promoApplied || null,
        total,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone || '',
        delivery_address: customer.address || '',
        special_instructions: instructions || '',
        table_number: customer.table || '',
        stripe_session_id: paymentIntent.id,
        scheduled_for: scheduledFor || '',
        estimated_time: typeof estimatedTime === 'number' ? estimatedTime : 20,
      });
    } catch (dbError) {
      console.error('DB save error (non-fatal):', dbError.message);
    }

    return Response.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey,
      orderNumber,
    });
  } catch (error) {
    console.error('createPaymentIntent error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});