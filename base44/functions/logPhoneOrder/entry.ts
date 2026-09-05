import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendSmashieSms } from '../../shared/sendSmashieSms.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { customer_name, customer_phone, customer_email, items, order_type, delivery_address, special_instructions, total } = body;

    if (!customer_name || !customer_phone || !items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Missing required fields: customer_name, customer_phone, items' }, { status: 400 });
    }
    // Email is the ONLY working delivery channel for payment links right now
    // (outbound SMS is blocked until the A2P 10DLC campaign is approved), so an
    // order without an email address can never be paid for.
    if (!customer_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
      return Response.json({ error: 'A valid customer_email is required — the payment link is delivered by email.' }, { status: 400 });
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

    // Keep the order pending until the customer pays through the Square link.
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
      customer_email,
      delivery_address: delivery_address || '',
      special_instructions: special_instructions || '',
      payment_status: 'pending',
    });

    let paymentUrl = null;
    let squareOrderId = null;
    let paymentLinkSent = false;
    let paymentLinkEmailed = false;

    try {
      // Use the authorized Square connector (same source as the online orders).
      const connection = await base44.asServiceRole.connectors.getConnection('square');
      const accessToken = connection.accessToken;

      // Resolve the Square location id.
      let locationId = connection.connectionConfig?.locationId;
      if (!locationId) {
        const locRes = await fetch('https://connect.squareup.com/v2/locations', {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Square-Version': '2024-01-18' },
        });
        const locData = await locRes.json();
        locationId = locData.locations?.[0]?.id;
      }
      if (!locationId) throw new Error('Could not resolve Square location ID');

      const sqHeaders = {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-01-18',
        'Content-Type': 'application/json',
      };

      const orderTypeLabel = order_type === 'delivery' ? 'Delivery' : order_type === 'dine_in' ? 'Dine-In' : 'Pickup';

      // Ad-hoc line items (phone orders are not tied to catalog variations).
      const lineItems = items.map((item) => {
        const mods = (item.selectedModifiers || []).map((m) => m.name).filter(Boolean).join(', ');
        return {
          name: mods ? `${item.name || 'Item'} (${mods})` : (item.name || 'Item'),
          quantity: String(Number(item.quantity) || 1),
          base_price_money: {
            amount: Math.round((Number(item.price) || 0) * 100),
            currency: 'USD',
          },
        };
      });

      const fulfillmentNote = [
        `PHONE ORDER (${orderTypeLabel})`,
        customer_name,
        customer_phone,
        delivery_address ? `Deliver to: ${delivery_address}` : '',
        special_instructions ? `Notes: ${special_instructions}` : '',
      ].filter(Boolean).join('\n');

      // Create a Square-hosted checkout payment link for the phone order.
      const linkRes = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
        method: 'POST',
        headers: sqHeaders,
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          description: `Flavor Isle Phone Order #${orderNumber}`,
          order: {
            location_id: locationId,
            source: { name: 'Phone Order' },
            line_items: lineItems,
            taxes: [
              {
                uid: 'sales-tax',
                name: 'Sales Tax',
                type: 'ADDITIVE',
                percentage: '6.00',
                scope: 'ORDER',
              },
            ],
            metadata: {
              order_number: orderNumber,
              order_type: order_type || 'pickup',
              customer_name,
              customer_phone,
              phone_order: 'true',
            },
            fulfillments: [
              {
                type: 'PICKUP',
                state: 'PROPOSED',
                pickup_details: {
                  recipient: {
                    display_name: customer_name,
                    phone_number: customer_phone,
                  },
                  note: fulfillmentNote,
                },
              },
            ],
          },
          checkout_options: {
            allow_tipping: false,
            ask_for_shipping_address: false,
          },
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

      // Send the payment link via email (primary — reliable, not blocked by
      // carrier A2P 10DLC rules) and SMS (secondary — may fail until the
      // Twilio A2P campaign is registered).
      if (paymentUrl && customer_email) {
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
      }
      if (paymentUrl) {
        paymentLinkSent = await sendSmashieSms(
          customer_phone,
          `Flavor Isle: Pay $${finalTotal.toFixed(2)} securely for phone order #${orderNumber} with Square: ${paymentUrl}`,
        );
      }
    } catch (squareErr) {
      console.error('Square payment link error:', squareErr.message);
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