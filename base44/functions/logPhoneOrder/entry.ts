import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { normalizePhone, sendSmashieSms } from '../../shared/sendSmashieSms.ts';

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
      const connection = await base44.asServiceRole.connectors.getConnection('square');
      const accessToken = connection.accessToken;
      let locationId = connection.connectionConfig?.locationId;

      if (!locationId) {
        const locRes = await fetch('https://connect.squareup.com/v2/locations', {
          headers: { Authorization: `Bearer ${accessToken}`, 'Square-Version': '2024-01-18' },
        });
        const locData = await locRes.json();
        locationId = locData.locations?.[0]?.id;
      }

      if (locationId) {
        const lineItems = items.map((item) => ({
          name: item.name,
          quantity: String(Number(item.quantity) || 1),
          base_price_money: {
            amount: Math.round((Number(item.price) || 0) * 100),
            currency: 'USD',
          },
        }));
        let pickupNote = `CALL IN — ${(order_type || 'pickup').toUpperCase()}\n${customer_name}\n${customer_phone}`;
        if (order_type === 'delivery') pickupNote += `\nDELIVER TO: ${delivery_address}`;

        const linkRes = await fetch('https://connect.squareup.com/v2/online-checkout/payment-links', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Square-Version': '2024-01-18',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            idempotency_key: crypto.randomUUID(),
            order: {
              location_id: locationId,
              line_items: lineItems,
              taxes: [{ name: 'Sales Tax', percentage: '6', scope: 'ORDER' }],
              fulfillments: [{
                type: 'PICKUP',
                state: 'PROPOSED',
                pickup_details: {
                  recipient: { display_name: customer_name, phone_number: normalizePhone(customer_phone) },
                  pickup_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
                  note: pickupNote + (special_instructions ? `\n\nNOTES: ${special_instructions}` : ''),
                },
              }],
              metadata: {
                order_source: 'phone-order',
                order_number: orderNumber,
                order_type: order_type || 'pickup',
              },
            },
            checkout_options: {
              redirect_url: `https://flavor-isle.com/order-confirmation?order_number=${orderNumber}`,
              ask_for_shipping_address: false,
            },
            pre_populated_data: { buyer_phone_number: normalizePhone(customer_phone) },
          }),
        });
        const linkData = await linkRes.json();
        if (!linkRes.ok) throw new Error(`Square payment link failed: ${JSON.stringify(linkData)}`);

        paymentUrl = linkData.payment_link?.url || null;
        const squareOrderId = linkData.payment_link?.order_id || null;
        if (squareOrderId) {
          await base44.asServiceRole.entities.Order.update(order.id, { square_order_id: squareOrderId });
        }
        if (paymentUrl) {
          paymentLinkSent = await sendSmashieSms(
            customer_phone,
            `Flavor Isle: Pay $${finalTotal.toFixed(2)} securely for phone order #${orderNumber}: ${paymentUrl}`,
          );
        }
      }
    } catch (squareErr) {
      console.error('Square payment link error:', squareErr.message);
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