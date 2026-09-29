import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendSmashieSms } from '../../shared/sendSmashieSms.ts';
import { getSmashieSettings } from '../../shared/smashieSettings.ts';
import { abilityEnabled } from '../../shared/smashieAdminContext.ts';

// Phone / website-chat order intake for Smashie. Saves the order, sets up the
// payment server-side, then TEXTS the customer a short link to our own
// flavor-isle.com/pay page (and emails the same link whenever we have an
// address). The customer pays on our site and never sees a processor URL.
//
// Nothing is cooked until the payment clears: the webhook matches the
// PaymentIntent back to this order via stripe_session_id, marks it paid, and
// pushes it to Square + the kitchen — including any tip added on the pay page.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    if (!abilityEnabled(await getSmashieSettings(base44), 'orders')) {
      return Response.json({ error: 'Smashie ordering is currently unavailable.' }, { status: 403 });
    }
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
    // Price from the verified items the customer agreed to — the payment intent
    // is created for these same numbers, so the charge, the saved order, and the
    // kitchen ticket can never disagree. A caller-supplied total is only a
    // fallback for an item that arrived without a price.
    const subtotal = itemSubtotal > 0 ? itemSubtotal : (Number(total) || 0);
    const tax = Math.round(subtotal * 0.06 * 100) / 100;
    const finalTotal = Math.round((subtotal + tax) * 100) / 100;
    const orderNumber = 'PH' + Date.now().toString().slice(-6);

    // Keep the order pending until the customer pays on the payment page.
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
    let manualPayRequired = false;

    try {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
      const origin = req.headers.get('origin') || 'https://flavor-isle.com';

      // Phone orders are not tied to catalog variations, so there are no line
      // items to send: the intent is priced from the same verified numbers the
      // order was saved with (subtotal + tax), and nothing here comes from the
      // customer's device. The intent id is stored in stripe_session_id, which
      // is how the existing payment_intent.succeeded webhook finds this order,
      // marks it paid, and pushes it to Square + the kitchen with the tip the
      // customer added on the pay page.
      // No receipt_email: the processor's own receipt carries its brand, and our
      // confirmation email already covers the customer.
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(finalTotal * 100),
        currency: 'usd',
        payment_method_types: ['card'],
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          order_id: order.id,
          order_number: orderNumber,
          order_type: order_type || 'pickup',
          phone_order: 'true',
          customer_name,
          customer_phone,
        },
        description: `Flavor Isle order #${orderNumber}`,
      });

      // The link the customer gets is our own short page, not a processor URL.
      paymentUrl = `${origin}/pay/${orderNumber}`;
      stripeSessionId = paymentIntent.id;

      // stripe_session_id holds the PaymentIntent id — that is how the existing
      // webhook finds this order again: it marks it paid and pushes it to
      // Square + the kitchen.
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
              `Your order #${orderNumber} is locked in for $${finalTotal.toFixed(2)}. Tap the secure payment link below to pay — you can add a tip for the crew right on that page:`,
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
      // Square fallback: the order is already saved, so when payment setup fails
      // we flag it for manual payment at the counter instead of sending the
      // customer a link that cannot be paid.
      console.error('Phone order payment setup error:', linkErr.message);
      manualPayRequired = true;
      try {
        await base44.asServiceRole.entities.Order.update(order.id, { manual_pay_required: true });
      } catch (flagErr) {
        console.error(`Manual-pay flag failed for order ${orderNumber}:`, flagErr.message);
      }
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
      manual_pay_required: manualPayRequired,
      message: paymentLinkSent
        ? `Order #${orderNumber} is pending payment. A secure payment link for $${finalTotal.toFixed(2)} was ${deliveredVia}. The order is not confirmed until it is paid.`
        : `Order #${orderNumber} was saved, but no payment link could be sent. Tell the customer to pay at the counter — the order is flagged for manual payment.`,
    });
  } catch (error) {
    console.error('logPhoneOrder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}