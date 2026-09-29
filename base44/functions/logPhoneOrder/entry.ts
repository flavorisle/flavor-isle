import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendSmashieSms } from '../../shared/sendSmashieSms.ts';

// Phone / website-chat order intake for Smashie. Saves the order, creates a
// Stripe Checkout payment link, then TEXTS that link to the customer's number
// (and emails the same link whenever we have an address).
//
// Nothing is cooked until Stripe confirms payment: the Stripe webhook matches
// the session back to this order via stripe_session_id, marks it paid, and
// pushes it to Square + the kitchen.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { customer_name, customer_phone, customer_email, items, order_type, delivery_address, special_instructions, total } = body;

    if (!customer_name || !customer_phone || !items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Missing required fields: customer_name, customer_phone, items' }, { status: 400 });
    }
    // The payment link is TEXTED to the customer's number, so a usable phone is
    // the one hard requirement. Email is optional — when we have one, the same
    // link is emailed as a backup.
    const phoneDigits = String(customer_phone).replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      return Response.json({ error: 'A valid customer_phone is required — the payment link is texted.' }, { status: 400 });
    }
    const emailOk = !!customer_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email);
    if (order_type === 'delivery' && !delivery_address) {
      return Response.json({ error: 'A delivery address is required for delivery orders' }, { status: 400 });
    }

    // Orders without an email still need a value for the required field — this
    // placeholder is already treated as "no email" by the order emails.
    const orderEmail = emailOk ? customer_email : 'phone-order@flavorisle.com';

    const itemSubtotal = items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0,
    );
    const subtotal = Number(total) > 0 ? Number(total) : itemSubtotal;
    const tax = Math.round(subtotal * 0.06 * 100) / 100;
    const finalTotal = Math.round((subtotal + tax) * 100) / 100;
    const orderNumber = 'PH' + Date.now().toString().slice(-6);

    // Keep the order pending until the customer pays through the Stripe link.
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
      customer_email: orderEmail,
      delivery_address: delivery_address || '',
      special_instructions: special_instructions || '',
      payment_status: 'pending',
    });

    let paymentUrl = null;
    let stripeSessionId = null;
    let paymentLinkSent = false;
    let paymentLinkEmailed = false;

    try {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
      const origin = req.headers.get('origin') || 'https://flavor-isle.com';

      // Phone orders are not tied to catalog variations, so the picked items go
      // in as their own line items at the verified prices Smashie read back.
      const lineItems = items.map((item) => {
        const mods = (item.selectedModifiers || []).map((m) => m.name).filter(Boolean).join(', ');
        return {
          price_data: {
            currency: 'usd',
            product_data: { name: mods ? `${item.name || 'Item'} (${mods})` : (item.name || 'Item') },
            unit_amount: Math.round((Number(item.price) || 0) * 100),
          },
          quantity: Number(item.quantity) || 1,
        };
      });

      if (tax > 0) {
        lineItems.push({
          price_data: {
            currency: 'usd',
            product_data: { name: 'Sales Tax (6%)' },
            unit_amount: Math.round(tax * 100),
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        ...(emailOk ? { customer_email } : {}),
        success_url: `${origin}/order-status?order=${orderNumber}`,
        cancel_url: `${origin}/menu`,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          order_id: order.id,
          order_number: orderNumber,
          order_type: order_type || 'pickup',
          phone_order: 'true',
          customer_name,
          customer_phone,
        },
        payment_intent_data: {
          metadata: { order_number: orderNumber, phone_order: 'true' },
        },
        custom_text: {
          submit: { message: `Order #${orderNumber} — we start cooking the second this goes through!` },
        },
      });

      paymentUrl = session.url;
      stripeSessionId = session.id;

      // stripe_session_id is how the Stripe webhook finds this order again: it
      // marks it paid and pushes it to Square + the kitchen.
      await base44.asServiceRole.entities.Order.update(order.id, {
        stripe_session_id: stripeSessionId,
        payment_url: paymentUrl,
      });

      // Text it first — the customer is on the phone (or in chat), so it lands
      // instantly. This is the primary delivery channel for the payment link.
      if (paymentUrl) {
        paymentLinkSent = await sendSmashieSms(
          customer_phone,
          `Flavor Isle: pay $${finalTotal.toFixed(2)} for order #${orderNumber} here: ${paymentUrl}`,
        );
      }

      // Email the same link as a backup when we have an address on file.
      if (paymentUrl && emailOk) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: customer_email,
            from_name: 'Smashie',
            subject: `Flavor Isle — Pay $${finalTotal.toFixed(2)} for order #${orderNumber}`,
            body: [
              `Hey ${customer_name}!`,
              ``,
              `Your order #${orderNumber} is locked in for $${finalTotal.toFixed(2)}. Tap the secure Stripe link below to pay:`,
              ``,
              paymentUrl,
              ``,
              `Once paid, the crew fires the grill and we'll have it ready for you.`,
              ``,
              `— Smashie & The Flavor Isle Team`,
              `103 N Main St, Smiths Grove, KY 42171`,
              `(270) 563-4618`,
            ].join('\n'),
          });
          paymentLinkEmailed = true;
        } catch (e) {
          console.error('Payment link email failed:', e.message);
        }
      }
    } catch (linkErr) {
      console.error('Phone order payment link error:', linkErr.message);
    }

    const deliveredVia = [
      paymentLinkSent ? 'texted to ' + customer_phone : null,
      paymentLinkEmailed ? 'emailed to ' + customer_email : null,
    ].filter(Boolean).join(' and ');

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
      payment_link_emailed: paymentLinkEmailed,
      message: paymentLinkSent
        ? `Order #${orderNumber} is pending payment. A secure Stripe link for $${finalTotal.toFixed(2)} was ${deliveredVia}. The order is not confirmed until it is paid.`
        : `Order #${orderNumber} was saved, but the payment link could not be sent. Text the pay link to ${customer_phone} manually, or have the customer pay at the counter.`,
    });
  } catch (error) {
    console.error('logPhoneOrder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}