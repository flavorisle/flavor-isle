import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.25.0';
import { secrets } from 'base44:runtime';
import { sendSmashieSms } from '../../shared/sendSmashieSms.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { customer_name, customer_phone, items, order_type, delivery_address, special_instructions, total } = body;

    if (!customer_name || !customer_phone || !items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Missing required fields: customer_name, customer_phone, items' }, { status: 400 });
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

    // Keep the order pending until the customer pays through the secure link.
    const order = await base44.asServiceRole.entities.Order.create({
      order_number: orderNumber,
      order_type: order_type || 'pickup',
      status: 'pending',
      items,
      subtotal,
      tax,
      total: finalTotal,
      customer_name,
      customer_phone,
      customer_email: 'phone-order@flavorisle.com',
      delivery_address: delivery_address || '',
      special_instructions: special_instructions || '',
      payment_status: 'pending',
    });

    let paymentUrl = null;
    let paymentLinkSent = false;

    try {
      const stripe = new Stripe(secrets.get('STRIPE_SECRET_KEY'));
      const lineItems = items.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: Math.round((Number(item.price) || 0) * 100),
        },
        quantity: Number(item.quantity) || 1,
      }));
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Sales Tax (6%)' },
          unit_amount: Math.round(tax * 100),
        },
        quantity: 1,
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `https://flavor-isle.com/order-confirmation?session_id={CHECKOUT_SESSION_ID}&order_number=${orderNumber}`,
        cancel_url: 'https://flavor-isle.com/contact',
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          order_number: orderNumber,
          order_type: order_type || 'pickup',
          customer_name,
          customer_phone,
          delivery_address: delivery_address || '',
          special_instructions: special_instructions || '',
          phone_order: 'true',
        },
      });

      paymentUrl = session.url;
      await base44.asServiceRole.entities.Order.update(order.id, { stripe_session_id: session.id });
      if (paymentUrl) {
        paymentLinkSent = await sendSmashieSms(
          customer_phone,
          `Flavor Isle: Pay $${finalTotal.toFixed(2)} securely for phone order #${orderNumber} with Stripe: ${paymentUrl}`,
        );
      }
    } catch (stripeErr) {
      console.error('Stripe payment link error:', stripeErr.message);
    }

    return Response.json({
      success: true,
      order_number: orderNumber,
      order_id: order.id,
      subtotal,
      tax,
      total: finalTotal,
      delivery_address: delivery_address || null,
      payment_url: paymentUrl,
      payment_link_sent: paymentLinkSent,
      message: paymentLinkSent
        ? `Phone order #${orderNumber} is pending payment. A secure link for $${finalTotal.toFixed(2)} was texted to ${customer_phone}.`
        : `Phone order #${orderNumber} is pending payment, but the payment link could not be texted. Transfer the caller to the counter for help.`,
    });
  } catch (error) {
    console.error('logPhoneOrder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}