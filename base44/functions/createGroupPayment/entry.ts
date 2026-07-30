import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Group / split payment:
// Creates ONE order record for the whole group (so the kitchen sees a single
// ticket and the group is charged a single delivery fee + tax), but splits the
// charge into N per-person Stripe PaymentIntents whose amounts sum to the total.
// Each person pays their own card; the group still only pays one fee.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      items, orderType, customer, instructions,
      subtotal, deliveryFee, tax, total,
      scheduledFor, estimatedTime,
      splits, // [{ person_name, subtotal, tax, deliveryFee, tip, total }]
      groupName,
    } = body;

    if (!items || items.length === 0) {
      return Response.json({ error: 'No items provided' }, { status: 400 });
    }
    if (!splits || splits.length === 0) {
      return Response.json({ error: 'No payment splits provided' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');

    const orderNumber = `FI-${Date.now().toString().slice(-6)}`;

    // Create one shared order record for the kitchen.
    try {
      await base44.asServiceRole.entities.Order.create({
        order_number: orderNumber,
        order_type: orderType,
        status: 'pending',
        payment_status: 'pending',
        items: items.map(i => ({
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image_url: i.image_url || '',
          selectedModifiers: i.selectedModifiers || [],
          person_name: i.person_name || '',
        })),
        subtotal,
        tax,
        delivery_fee: deliveryFee || 0,
        tip: 0,
        discount: 0,
        total,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone || '',
        delivery_address: customer.address || '',
        special_instructions: (instructions || '') + (groupName ? `\n[Group Order: ${groupName}]` : ''),
        table_number: customer.table || '',
        stripe_session_id: 'GROUP',
        scheduled_for: scheduledFor || '',
        estimated_time: typeof estimatedTime === 'number' ? estimatedTime : 20,
      });
    } catch (dbError) {
      console.error('DB save error (non-fatal):', dbError.message);
    }

    // One PaymentIntent per person; amounts already computed by the client to
    // sum to the group total (single fee + tax shared across people).
    const intents = [];
    for (const split of splits) {
      const amountCents = Math.round(split.total * 100);
      if (amountCents <= 0) continue;
      const pi = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'usd',
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          order_number: orderNumber,
          order_type: orderType,
          person_name: split.person_name || '',
          customer_name: customer.name,
          customer_email: customer.email,
        },
      });
      intents.push({
        person_name: split.person_name || 'Guest',
        clientSecret: pi.client_secret,
        amount: split.total,
        intentId: pi.id,
      });
    }

    return Response.json({
      orderNumber,
      publishableKey,
      intents,
    });
  } catch (error) {
    console.error('createGroupPayment error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});