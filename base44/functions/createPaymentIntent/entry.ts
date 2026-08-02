import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { items, orderType, customer, instructions, subtotal, deliveryFee, tax, total, tip, discount, redemptionId, scheduledFor, estimatedTime } = body;

    if (!items || items.length === 0) {
      return Response.json({ error: 'No items provided' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');

    const orderNumber = `FI-${Date.now().toString().slice(-6)}`;
    const amountCents = Math.round(total * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'usd',
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
    });

    // Save order entity as pending
    try {
      await base44.asServiceRole.entities.Order.create({
        order_number: orderNumber,
        order_type: orderType,
        status: 'pending',
        payment_status: 'pending',
        items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url || '', selectedModifiers: i.selectedModifiers || [], catalog_object_id: i.catalog_object_id || '', isBuildShake: !!i.isBuildShake })),
        subtotal,
        tax,
        delivery_fee: deliveryFee || 0,
        tip: tip || 0,
        discount: discount || 0,
        redemption_id: redemptionId || '',
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