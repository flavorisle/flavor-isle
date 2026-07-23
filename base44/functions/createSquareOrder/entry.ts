import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { items, orderType, orderNumber, customer, instructions, total, tax, deliveryFee, tip } = body;

    const orderTypeLabel = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' }[orderType] || 'Pickup';
    const displayName = orderNumber
      ? `${customer.name} (#${orderNumber}) ${orderTypeLabel}`
      : `${customer.name} ${orderTypeLabel}`;

    // Get Square access token via connector
    const connection = await base44.asServiceRole.connectors.getConnection('square');
    const accessToken = connection.accessToken;

    // Resolve actual location ID
    let locationId = connection.connectionConfig?.locationId;
    if (!locationId) {
      const locRes = await fetch('https://connect.squareup.com/v2/locations', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Square-Version': '2024-01-18' }
      });
      const locData = await locRes.json();
      locationId = locData.locations?.[0]?.id;
    }
    if (!locationId) return Response.json({ error: 'Could not resolve Square location ID' }, { status: 500 });

    const sqHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Square-Version': '2024-01-18',
      'Content-Type': 'application/json',
    };

    // Find or create a Square customer (by phone first, then email) so the
    // order links to their customer account like Square Online orders do.
    let customerId = null;
    const digits = (customer.phone || '').replace(/\D/g, '');
    const e164Phone = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith('1') ? `+${digits}` : null;
    const normalizedEmail = (customer.email || '').toLowerCase().trim();

    const searchCustomer = async (filter) => {
      const res = await fetch('https://connect.squareup.com/v2/customers/search', {
        method: 'POST',
        headers: sqHeaders,
        body: JSON.stringify({ query: { filter }, limit: 1 }),
      });
      const data = await res.json();
      return data?.customers?.[0]?.id || null;
    };

    try {
      if (e164Phone) customerId = await searchCustomer({ phone_number: { exact: e164Phone } });
      if (!customerId && normalizedEmail) customerId = await searchCustomer({ email_address: { exact: normalizedEmail } });

      if (!customerId) {
        const nameParts = (customer.name || '').trim().split(/\s+/);
        const createCustomer = async (includePhone) => {
          const res = await fetch('https://connect.squareup.com/v2/customers', {
            method: 'POST',
            headers: sqHeaders,
            body: JSON.stringify({
              idempotency_key: crypto.randomUUID(),
              given_name: nameParts[0] || '',
              family_name: nameParts.slice(1).join(' ') || undefined,
              ...(normalizedEmail ? { email_address: normalizedEmail } : {}),
              ...(includePhone && e164Phone ? { phone_number: e164Phone } : {}),
            }),
          });
          const data = await res.json();
          if (!res.ok) console.error('Square customer create error:', JSON.stringify(data.errors));
          return data?.customer?.id || null;
        };
        customerId = await createCustomer(true);
        // Square rejects some phone formats — retry without the phone so the
        // customer still gets linked by name/email.
        if (!customerId && e164Phone) customerId = await createCustomer(false);
        if (customerId) console.log('Square customer created:', customerId);
      } else {
        console.log('Square customer matched:', customerId);
      }
    } catch (err) {
      console.error('Square customer lookup/create failed:', err.message);
    }

    const idempotencyKey = crypto.randomUUID();

    const lineItems = items.map(item => {
      const mods = (item.selectedModifiers || []).map(m => m.name).filter(Boolean).join(', ');
      // item.price already includes any modifier upcharges from the cart —
      // do NOT add them again here or modified items get overcharged in Square.
      return {
        name: mods ? `${item.name || item.catalog_object_id} (${mods})` : (item.name || item.catalog_object_id),
        quantity: String(item.quantity || 1),
        base_price_money: {
          amount: Math.round((item.price || item.base_price_money?.amount / 100 || 0) * 100),
          currency: 'USD',
        },
        catalog_object_id: item.catalog_object_id,
      };
    });

    // Add tax and delivery fee as fixed-amount service charges so the Square
    // order total matches the amount the customer was actually charged.
    const serviceCharges = [];
    if (tax > 0) {
      serviceCharges.push({
        uid: 'sales-tax',
        name: 'Sales Tax',
        amount_money: { amount: Math.round(tax * 100), currency: 'USD' },
        calculation_phase: 'TOTAL_PHASE',
        taxable: false,
      });
    }
    if (deliveryFee > 0) {
      serviceCharges.push({
        uid: 'delivery-fee',
        name: 'Delivery Fee',
        amount_money: { amount: Math.round(deliveryFee * 100), currency: 'USD' },
        calculation_phase: 'TOTAL_PHASE',
        taxable: false,
      });
    }

    // Format note based on order type for kitchen printing
    let pickupNote = '';
    if (orderType === 'pickup') {
      pickupNote = `PICKUP\n${customer.name}\n${customer.phone || ''}`;
    } else if (orderType === 'delivery') {
      pickupNote = `DELIVERY\n${customer.name}\n${customer.address || ''}\n${customer.phone || ''}`;
    } else if (orderType === 'dine_in') {
      pickupNote = `DINE IN\nTable: ${customer.table || 'N/A'}\n${customer.name}`;
    }

    const squareOrder = {
      idempotency_key: idempotencyKey,
      order: {
        location_id: locationId,
        source: { name: orderTypeLabel },
        ...(customerId ? { customer_id: customerId } : {}),
        fulfillments: [{
          type: 'PICKUP',
          state: 'PROPOSED',
          pickup_details: {
            recipient: {
              display_name: displayName,
              phone_number: e164Phone || customer.phone || '',
              ...(normalizedEmail ? { email_address: normalizedEmail } : {}),
              ...(customerId ? { customer_id: customerId } : {}),
            },
            pickup_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
            note: pickupNote + (instructions ? '\n\nNOTES: ' + instructions : ''),
          },
        }],
        line_items: lineItems,
        ...(serviceCharges.length > 0 ? { service_charges: serviceCharges } : {}),
        metadata: {
          customer_email: customer.email,
          order_source: 'flavor-isle-website',
          order_type: orderType,
        },
      },
    };

    const response = await fetch('https://connect.squareup.com/v2/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2024-01-18',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(squareOrder),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Square error:', JSON.stringify(data));
      return Response.json({ error: 'Square order creation failed', details: data }, { status: 500 });
    }

    console.log('Square order created:', data.order?.id);

    // Record the payment (already collected via Stripe) as an EXTERNAL payment.
    // Square POS only surfaces PAID orders as active tickets, so without this
    // step the order never appears on the register.
    const netDue = data.order?.net_amount_due_money?.amount || 0;
    if (netDue > 0) {
      const payRes = await fetch('https://connect.squareup.com/v2/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': '2024-01-18',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          source_id: 'EXTERNAL',
          external_details: { type: 'CARD', source: 'Card' },
          order_id: data.order.id,
          location_id: locationId,
          ...(customerId ? { customer_id: customerId } : {}),
          amount_money: { amount: netDue, currency: 'USD' },
          ...(tip > 0 ? { tip_money: { amount: Math.round(tip * 100), currency: 'USD' } } : {}),
        }),
      });
      const payData = await payRes.json();
      if (!payRes.ok) {
        console.error('Square payment recording failed:', JSON.stringify(payData));
      } else {
        console.log('Square payment recorded:', payData.payment?.id);
      }
    }

    return Response.json({ order_id: data.order?.id, order: data.order });
  } catch (error) {
    console.error('Square order error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});