import { createSquarePhonePayment } from '../../shared/squarePhonePayment.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendSmashieSms } from '../../shared/sendSmashieSms.ts';
import { pushOrderToSquareAndKitchen } from '../../shared/fulfillOrder.ts';
import { findBlock } from '../../shared/blockedContacts.ts';

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
    const { customer_name, customer_phone, customer_email, items, order_type, delivery_address, special_instructions, total, payment_method = 'card' } = body;
    if (!['card', 'cash_on_pickup'].includes(payment_method)) return Response.json({ error: 'Choose card or cash_on_pickup.' }, { status: 400 });
    const cashPickup = payment_method === 'cash_on_pickup';
    if (cashPickup && order_type && order_type !== 'pickup') return Response.json({ error: 'Cash at pickup is available only for pickup orders.' }, { status: 400 });

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

    // Blocked callers, texters, and chat customers never get an order placed.
    // Smashie is told to decline up front; this is the gate that guarantees it.
    const block = await findBlock(base44, { phone: customer_phone, email: emailOk ? customer_email : '' });
    if (block) {
      console.log(`Blocked order attempt from ${customer_phone}`);
      return Response.json({ error: 'This customer is blocked — their order was not placed. Politely say we are not able to take their order and offer to pass a message to management.' }, { status: 403 });
    }

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
    const orderNumber = Date.now().toString().slice(-6);

    // Keep the order pending until the customer pays on the payment page.
    const order = await base44.asServiceRole.entities.Order.create({
      order_number: orderNumber,
      order_type: order_type || 'pickup',
      status: cashPickup ? 'confirmed' : 'pending',
      pay_cash_on_pickup: cashPickup,
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
      payment_provider: 'square',
      manual_pay_required: true,
    });

    if (cashPickup) {
      await pushOrderToSquareAndKitchen(base44, order);
      return Response.json({ success: true, order_number: orderNumber, order_id: order.id, subtotal, tax, total: finalTotal,
        payment_method: 'cash_on_pickup', payment_status: 'pending', payment_url: null, payment_link_sent: false,
        manual_pay_required: true, message: `Order #${orderNumber} is confirmed for pickup. Pay $${finalTotal.toFixed(2)} in cash at the counter when you pick it up. No payment link is needed; cash has not yet been collected.` });
    }

    let paymentUrl = null;
    let paymentLinkSent = false;
    let paymentLinkEmailed = false;
    let manualPayRequired = false;

    try {
      // Square is the default. Only staff can explicitly select Stripe later.
      paymentUrl = await createSquarePhonePayment(base44, order);

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
        : `Order #${orderNumber} was saved, but no payment link could be sent. Ask staff to resend the Square link or send a Stripe backup; do not claim the order is paid.`,
      payment_provider: 'square',
    });
  } catch (error) {
    console.error('logPhoneOrder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}