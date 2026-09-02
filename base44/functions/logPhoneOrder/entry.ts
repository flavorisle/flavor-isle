import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendSmashieSms } from '../../shared/sendSmashieSms.ts';

const SQUARE_VERSION = '2024-01-18';

// Builds the Square order body shared by both payment paths: the hosted
// payment link (card online) and the saved open ticket (pay at pickup).
function buildSquareOrder({ locationId, orderNumber, items, order_type, customer_name, customer_phone, delivery_address, special_instructions, payAtPickup, finalTotal }) {
  const orderTypeLabel = order_type === 'delivery' ? 'Delivery' : order_type === 'dine_in' ? 'Dine-In' : 'Pickup';

  // Ad-hoc line items (phone orders are not tied to catalog variations).
  const lineItems = items.map((item) => {
    const mods = (item.selectedModifiers || []).map((m) => m.name).filter(Boolean).join(', ');
    return {
      name: mods ? `${item.name || 'Item'} (${mods})` : (item.name || 'Item'),
      quantity: String(Number(item.quantity) || 1),
      base_price_money: { amount: Math.round((Number(item.price) || 0) * 100), currency: 'USD' },
    };
  });

  const fulfillmentNote = [
    payAtPickup ? `PAY AT PICKUP — collect $${finalTotal.toFixed(2)} (cash or card)` : '',
    `PHONE ORDER (${orderTypeLabel})`,
    customer_name,
    customer_phone,
    delivery_address ? `Deliver to: ${delivery_address}` : '',
    special_instructions ? `Notes: ${special_instructions}` : '',
  ].filter(Boolean).join('\n');

  const order = {
    location_id: locationId,
    source: { name: payAtPickup ? 'Phone Order — Pay at Pickup' : 'Phone Order' },
    line_items: lineItems,
    taxes: [{ uid: 'sales-tax', name: 'Sales Tax', type: 'ADDITIVE', percentage: '6.00', scope: 'ORDER' }],
    metadata: {
      order_number: orderNumber,
      order_type: order_type || 'pickup',
      customer_name,
      customer_phone,
      phone_order: 'true',
      payment_method: payAtPickup ? 'pay_at_pickup' : 'card_online',
    },
    fulfillments: [{
      type: 'PICKUP',
      state: 'PROPOSED',
      pickup_details: {
        recipient: { display_name: customer_name, phone_number: customer_phone },
        note: fulfillmentNote,
      },
    }],
  };
  // Name the open ticket so staff can find it fast in Square POS.
  if (payAtPickup) order.ticket_name = `${customer_name} · #${orderNumber}`;
  return order;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { customer_name, customer_phone, customer_email, items, order_type, delivery_address, special_instructions, total } = body;
    const payAtPickup = body.payment_method === 'pay_at_pickup';

    if (!customer_name || !customer_phone || !items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Missing required fields: customer_name, customer_phone, items' }, { status: 400 });
    }
    // Email is required for every order: it carries the payment link for card
    // orders and the confirmation + status updates for pay-at-pickup orders.
    if (!customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
      return Response.json({ error: 'A valid customer_email is required — order confirmations and payment links are delivered by email.' }, { status: 400 });
    }
    if (order_type === 'delivery' && !delivery_address) {
      return Response.json({ error: 'A delivery address is required for delivery orders' }, { status: 400 });
    }
    if (payAtPickup && order_type === 'delivery') {
      return Response.json({ error: 'Pay at pickup is only available for pickup and dine-in orders. Delivery orders must be paid online.' }, { status: 400 });
    }

    const itemSubtotal = items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
      0,
    );
    const subtotal = Number(total) > 0 ? Number(total) : itemSubtotal;
    const tax = Math.round(subtotal * 0.06 * 100) / 100;
    const finalTotal = Math.round((subtotal + tax) * 100) / 100;
    const orderNumber = 'PH' + Date.now().toString().slice(-6);

    // Card-online orders stay pending until the Square link is paid.
    // Pay-at-pickup orders are confirmed immediately so the kitchen fires now.
    const order = await base44.asServiceRole.entities.Order.create({
      order_number: orderNumber,
      order_type: order_type || 'pickup',
      status: payAtPickup ? 'confirmed' : 'pending',
      items,
      subtotal,
      tax,
      total: finalTotal,
      customer_name,
      customer_phone,
      customer_email,
      delivery_address: delivery_address || '',
      special_instructions: special_instructions || '',
      payment_status: 'pending',
      payment_method: payAtPickup ? 'pay_at_pickup' : 'card_online',
    });

    let paymentUrl = null;
    let squareOrderId = null;
    let paymentLinkSent = false;
    let paymentLinkEmailed = false;
    let confirmationEmailed = false;

    try {
      // Use the authorized Square connector (same source as the online orders).
      const connection = await base44.asServiceRole.connectors.getConnection('square');
      const accessToken = connection.accessToken;

      let locationId = connection.connectionConfig?.locationId;
      if (!locationId) {
        const locRes = await fetch('https://connect.squareup.com/v2/locations', {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Square-Version': SQUARE_VERSION },
        });
        const locData = await locRes.json();
        locationId = locData.locations?.[0]?.id;
      }
      if (!locationId) throw new Error('Could not resolve Square location ID');

      const sqHeaders = {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': SQUARE_VERSION,
        'Content-Type': 'application/json',
      };

      const squareOrder = buildSquareOrder({
        locationId, orderNumber, items, order_type, customer_name, customer_phone,
        delivery_address, special_instructions, payAtPickup, finalTotal,
      });

      if (payAtPickup) {
        // Save the order as an OPEN Square ticket — no payment link. Staff pulls
        // it up in Square POS (Orders → search #orderNumber / name) at pickup
        // and tenders cash or card on it without re-ringing anything.
        const orderRes = await fetch('https://connect.squareup.com/v2/orders', {
          method: 'POST',
          headers: sqHeaders,
          body: JSON.stringify({ idempotency_key: crypto.randomUUID(), order: squareOrder }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok) {
          console.error('Square order create error:', JSON.stringify(orderData.errors || orderData));
          throw new Error(orderData.errors?.[0]?.detail || 'Square order creation failed');
        }
        squareOrderId = orderData.order?.id || null;
        if (squareOrderId) {
          await base44.asServiceRole.entities.Order.update(order.id, { square_order_id: squareOrderId });
        }

        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: customer_email,
            from_name: 'Smashie',
            subject: `Flavor Isle — Order #${orderNumber} confirmed · $${finalTotal.toFixed(2)} due at pickup`,
            body: [
              `Hey ${customer_name}!`,
              ``,
              `Your order #${orderNumber} is confirmed and the crew is firing it up now.`,
              ``,
              `Total due at pickup: $${finalTotal.toFixed(2)} — pay with cash or card at the counter. Just give us your name or order number when you arrive.`,
              ``,
              ...items.map((i) => `• ${Number(i.quantity) || 1}× ${i.name}`),
              ``,
              `— Smashie & The Flavor Isle Team`,
              `103 N Main St, Smiths Grove, KY 42171`,
              `(270) 563-4618`,
            ].join('\n'),
          });
          confirmationEmailed = true;
        } catch (e) {
          console.error('Confirmation email failed:', e.message);
        }
      } else {
        // Create a Square-hosted checkout payment link for the phone order.
        const linkRes = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
          method: 'POST',
          headers: sqHeaders,
          body: JSON.stringify({
            idempotency_key: crypto.randomUUID(),
            description: `Flavor Isle Phone Order #${orderNumber}`,
            order: squareOrder,
            checkout_options: { allow_tipping: false, ask_for_shipping_address: false },
          }),
        });

        const linkData = await linkRes.json();
        if (!linkRes.ok) {
          console.error('Square payment link error:', JSON.stringify(linkData.errors || linkData));
          throw new Error(linkData.errors?.[0]?.detail || 'Square payment link creation failed');
        }

        paymentUrl = linkData.payment_link?.url || linkData.payment_link?.long_url || null;
        squareOrderId = linkData.payment_link?.order_id || linkData.order?.id || null;

        const updateFields = {};
        if (squareOrderId) updateFields.square_order_id = squareOrderId;
        if (paymentUrl) updateFields.payment_url = paymentUrl;
        if (Object.keys(updateFields).length > 0) {
          await base44.asServiceRole.entities.Order.update(order.id, updateFields);
        }

        // Email is primary (reliable); SMS is secondary and may fail until the
        // Twilio A2P campaign is registered.
        if (paymentUrl) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: customer_email,
              from_name: 'Smashie',
              subject: `Flavor Isle — Pay $${finalTotal.toFixed(2)} for order #${orderNumber}`,
              body: [
                `Hey ${customer_name}!`,
                ``,
                `Your phone order #${orderNumber} is locked in for $${finalTotal.toFixed(2)}. Tap the secure Square link below to pay:`,
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
          paymentLinkSent = await sendSmashieSms(
            customer_phone,
            `Flavor Isle: Pay $${finalTotal.toFixed(2)} securely for phone order #${orderNumber} with Square: ${paymentUrl}`,
          );
        }
      }
    } catch (squareErr) {
      console.error('Square error:', squareErr.message);
    }

    if (payAtPickup) {
      return Response.json({
        success: true,
        order_number: orderNumber,
        order_id: order.id,
        square_order_id: squareOrderId,
        subtotal,
        tax,
        total: finalTotal,
        payment_method: 'pay_at_pickup',
        confirmation_emailed: confirmationEmailed,
        message: squareOrderId
          ? `Order #${orderNumber} is confirmed and the kitchen is on it. $${finalTotal.toFixed(2)} is due at pickup — cash or card at the counter. ${confirmationEmailed ? `A confirmation was emailed to ${customer_email}.` : ''}`
          : `Order #${orderNumber} is confirmed for $${finalTotal.toFixed(2)} due at pickup, but it could not be saved to the register — let the counter know the order number when you arrive.`,
      });
    }

    const deliveredVia = [
      paymentLinkEmailed ? 'emailed to ' + customer_email : null,
      paymentLinkSent ? 'texted to ' + customer_phone : null,
    ].filter(Boolean).join(' and ');

    return Response.json({
      success: true,
      order_number: orderNumber,
      order_id: order.id,
      square_order_id: squareOrderId,
      subtotal,
      tax,
      total: finalTotal,
      delivery_address: delivery_address || null,
      payment_method: 'card_online',
      payment_url: paymentUrl,
      payment_link_sent: paymentLinkSent,
      payment_link_emailed: paymentLinkEmailed,
      message: paymentLinkEmailed
        ? `Order #${orderNumber} is pending payment. A secure Square link for $${finalTotal.toFixed(2)} was ${deliveredVia}.`
        : `Order #${orderNumber} is pending payment, but the payment link could not be emailed to ${customer_email}. Confirm the email address or send them to the counter for help.`,
    });
  } catch (error) {
    console.error('logPhoneOrder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}