import { createStripePhonePayment } from '../../shared/stripePhonePayment.ts';
import { PHONE_ORDER_SOURCE, phoneOrderTotals } from '../../shared/phoneOrderPricing.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendSmashieSms } from '../../shared/sendSmashieSms.ts';
import { pushOrderToSquareAndKitchen } from '../../shared/fulfillOrder.ts';
import { findBlock } from '../../shared/blockedContacts.ts';
import { withTimeout } from '../../shared/withTimeout.ts';

// The caller is waiting on the line, so link setup is bounded: a stalled
// processor or SMS gateway falls through to the manual-pay reply with the total.
const PAY_LINK_SETUP_MS = 6000;

// Phone / website-chat order intake for Smashie. Saves the order, sets up the
// payment server-side, then TEXTS the customer a short link to our own
// flavor-isle.com/pay page (and emails the same link whenever we have an
// address). The customer pays on our site and never sees a processor URL.
//
// Nothing is cooked until the payment clears: the webhook (with the
// autoSyncUnpushedOrders sweep as backup) matches the PaymentIntent back to this
// order via stripe_session_id, marks it paid, and pushes it to Square + the
// kitchen — including any tip added on the pay page, even if the customer never
// returns to it.
export default async function(req) {
  let logPhone = 'unknown';
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { customer_name, customer_phone, customer_email, items, order_type, delivery_address, special_instructions, total, payment_method = 'card' } = body;
    if (customer_phone) logPhone = String(customer_phone);
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

    // One call places one order. While the phone pipeline hands a call between
    // workers, both can briefly observe the same confirmation, and a second
    // order for the same call would mean a second payment link and a second
    // ticket. The original order is returned instead.
    const callSid = String(body.call_sid || '').trim();
    if (callSid) {
      const alreadyPlaced = await base44.asServiceRole.entities.Order.filter({ source_call_sid: callSid }, '-created_date', 1);
      if (alreadyPlaced && alreadyPlaced.length) {
        const prior = alreadyPlaced[0];
        return Response.json({
          success: true,
          duplicate: true,
          order_number: prior.order_number,
          order_id: prior.id,
          subtotal: prior.subtotal,
          tax: prior.tax,
          total: prior.total,
          payment_url: prior.payment_url || null,
          payment_link_sent: !!prior.payment_url,
          manual_pay_required: !!prior.manual_pay_required,
          payment_method: prior.pay_cash_on_pickup ? 'cash_on_pickup' : 'card',
          message: prior.pay_cash_on_pickup
            ? `Order #${prior.order_number} was already confirmed on this call — repeat the same order number and total and say cash is due at the counter. Do not place a second order.`
            : `Order #${prior.order_number} was already placed on this call — repeat the same order number and total, and the payment-link status you gave before. Do not place a second order.`,
        });
      }
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
    const baseSubtotal = itemSubtotal > 0 ? itemSubtotal : (Number(total) || 0);

    // Delivery orders pay the delivery fee, resolved server-side exactly like
    // the website checkout (paused delivery, distance tiers, or the flat fee).
    let deliveryFee = 0;
    if (order_type === 'delivery') {
      const settings = await base44.asServiceRole.entities.MenuSetting.list();
      const setting = settings?.[0] || {};
      if (setting.delivery_enabled === false) {
        return Response.json({ error: 'Delivery is paused right now. Offer pickup or dine-in instead.' }, { status: 400 });
      }
      const tiers = (setting.delivery_tiers || []).filter((t) => t && Number(t.max_miles) > 0);
      if (tiers.length === 0) {
        deliveryFee = Number(setting.delivery_fee ?? 0) || 0;
      } else {
        const quoteRes = await base44.asServiceRole.functions.invoke('getDeliveryQuote', { address: delivery_address });
        const quote = quoteRes?.data || quoteRes;
        if (!quote?.ok || quote.out_of_range || quote.fee == null) {
          return Response.json({ error: 'That delivery address could not be quoted or is outside the delivery range. Offer pickup instead.' }, { status: 400 });
        }
        deliveryFee = Number(quote.fee) || 0;
      }
    }

    const { subtotal, tax, deliveryFee: orderDeliveryFee, total: finalTotal } = phoneOrderTotals(baseSubtotal, deliveryFee);
    const orderNumber = Date.now().toString().slice(-6);

    // Keep the order pending until the customer pays on the payment page.
    const order = await base44.asServiceRole.entities.Order.create({
      order_number: orderNumber,
      source_call_sid: callSid || undefined,
      order_type: order_type || 'pickup',
      status: cashPickup ? 'confirmed' : 'pending',
      pay_cash_on_pickup: cashPickup,
      items,
      subtotal,
      tax,
      delivery_fee: orderDeliveryFee,
      total: finalTotal,
      order_source: PHONE_ORDER_SOURCE,
      customer_name,
      customer_phone,
      customer_email: orderEmail,
      delivery_address: delivery_address || '',
      special_instructions: special_instructions || '',
      payment_status: 'pending',
      payment_provider: 'stripe',
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
    let linkTimedOut = false;

    try {
      await withTimeout(async () => {
      // Stripe PaymentIntent paid on flavor-isle.com/pay/:orderNumber.
      paymentUrl = await createStripePhonePayment(base44, order);

      // Text it first — the customer is on the phone (or in chat), so it lands
      // instantly. This is the primary delivery channel for the payment link.
      if (paymentUrl) {
        const payLinkBody = `Flavor Isle: pay $${finalTotal.toFixed(2)} for order #${orderNumber} here: ${paymentUrl}`;
        // Logged like every other customer text, so a pay link the carrier
        // refuses is visible in admin instead of looking like it went out.
        const payLinkLog = await base44.asServiceRole.entities.SmsDeliveryLog.create({
          order_id: order.id,
          order_number: orderNumber,
          customer_name,
          phone: customer_phone,
          milestone: 'confirmed',
          body: payLinkBody,
          status: 'pending',
          status_at: new Date().toISOString(),
        });
        paymentLinkSent = await sendSmashieSms(customer_phone, payLinkBody, { base44, logId: payLinkLog.id });
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
          console.error(`Payment link email failed for order ${orderNumber} (${customer_phone}):`, e.message);
        }
      }
      }, PAY_LINK_SETUP_MS, 'pay link setup');
    } catch (linkErr) {
      // Fallback: the order is already saved, so when payment setup fails
      // we flag it for manual payment at the counter instead of sending the
      // customer a link that cannot be paid.
      console.error(`Phone order payment setup error for order ${orderNumber} (${customer_phone}, link ${paymentUrl ? 'created' : 'not created'}, sent ${paymentLinkSent}):`, linkErr.message);
      manualPayRequired = true;
      linkTimedOut = linkErr?.name === 'TimeoutError';
      // Record why no link went out so it sits alongside the other customer texts.
      try {
        await base44.asServiceRole.entities.SmsDeliveryLog.create({
          order_id: order.id,
          order_number: orderNumber,
          customer_name,
          phone: customer_phone,
          milestone: 'confirmed',
          body: 'Secure pay link could not be created for this order.',
          status: 'failed',
          reason: String(linkErr.message || linkErr).slice(0, 1000),
          status_at: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error(`Pay-link delivery log failed for order ${orderNumber} (${customer_phone}):`, logErr.message);
      }
      try {
        await base44.asServiceRole.entities.Order.update(order.id, { manual_pay_required: true });
      } catch (flagErr) {
        console.error(`Manual-pay flag failed for order ${orderNumber} (${customer_phone}):`, flagErr.message);
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
      delivery_fee: orderDeliveryFee,
      total: finalTotal,
      delivery_address: delivery_address || null,
      payment_url: paymentUrl,
      payment_link_sent: paymentLinkSent,
      payment_link_emailed: paymentLinkEmailed,
      manual_pay_required: manualPayRequired,
      message: !paymentLinkSent && paymentUrl && linkTimedOut
        ? `Order #${orderNumber} was saved for $${finalTotal.toFixed(2)} (tell the customer this total). The payment link text was slow and may still arrive at ${customer_phone}. Tell them to check their texts in a minute, and if nothing comes, the crew can take payment at the counter at (270) 563-4618. Do not say it is paid, and do not place the order again.`
        : paymentLinkSent
        ? `Order #${orderNumber} total is $${finalTotal.toFixed(2)}${orderDeliveryFee > 0 ? ` including a $${orderDeliveryFee.toFixed(2)} delivery fee` : ''}. It is pending payment. A secure payment link for $${finalTotal.toFixed(2)} was ${deliveredVia}. The order is not confirmed until it is paid.`
        : `Order #${orderNumber} was saved for $${finalTotal.toFixed(2)} (tell the customer this total), but the pay link could not be sent to ${customer_phone}. Apologize, say the text did not go through, and offer to take this order as cash at pickup (pickup orders only) or pass the caller to the counter at (270) 563-4618. Never say the link is on its way, and do not claim the order is paid.`,
      payment_provider: 'stripe',
    });
  } catch (error) {
    console.error(`logPhoneOrder error for ${logPhone}:`, error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}