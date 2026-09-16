import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { formatItemModifiers } from '../../shared/ticketFormat.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { items, orderType, orderNumber, orderId, customer, instructions, total, tax, deliveryFee, tip, discount, happyHourDiscount } = body;

    // Atomic claim: try to set square_sync_claimed_at only if it's currently
    // null/empty. If another concurrent call already claimed or pushed the
    // order, updated === 0 and we skip — preventing duplicate Square orders
    // when the Stripe webhook fires both checkout.session.completed and
    // payment_intent.succeeded ~1s apart. This is a database-level atomic
    // operation (conditional updateMany), so the race window is eliminated.
    if (orderId) {
      try {
        const claim = await base44.asServiceRole.entities.Order.updateMany(
          { id: orderId, square_sync_claimed_at: null },
          { $set: { square_sync_claimed_at: new Date().toISOString() } }
        );
        if (!claim || claim.updated === 0) {
          const existing = await base44.asServiceRole.entities.Order.get(orderId);
          if (existing?.square_order_id) {
            console.log(`Order ${orderNumber} already pushed (${existing.square_order_id}) — skipping duplicate create`);
            return Response.json({ order_id: existing.square_order_id, already_synced: true });
          }
          console.log(`Order ${orderNumber} is being claimed by another call — skipping`);
          return Response.json({ order_id: null, already_synced: true });
        }
      } catch (claimErr) {
        console.warn('Atomic claim failed, falling back to pre-check:', claimErr.message);
        try {
          const existing = await base44.asServiceRole.entities.Order.get(orderId);
          if (existing?.square_order_id) {
            return Response.json({ order_id: existing.square_order_id, already_synced: true });
          }
          // Another call has a sync claim but hasn't set square_order_id yet
          // (still in the Square API call). Return already_synced to avoid a
          // duplicate — autoSyncUnpushedOrders will retry if no call succeeds.
          if (existing?.square_sync_claimed_at) {
            console.log(`Order ${orderNumber} has a sync claim from another call — skipping to avoid duplicate`);
            return Response.json({ order_id: null, already_synced: true });
          }
          // No claim and no square_order_id — the atomic claim threw for a
          // transient reason and no other call is in flight. Safe to proceed.
          console.log(`Order ${orderNumber} — atomic claim threw but no existing claim, proceeding`);
        } catch (e) {
          // Can't read the order — be conservative, let autoSync retry.
          return Response.json({ order_id: null, already_synced: true });
        }
      }
    }

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

    // Deterministic idempotency key derived from the app order id so Square
    // rejects a duplicate create even if two triggers race past the pre-check
    // above. Square returns the SAME order for a repeated key.
    const idempotencyKey = orderId ? `flavor-isle-order-${orderId}` : crypto.randomUUID();

    const lineItems = items.map(item => {
      // Milkshakes are built from a single Square "Milkshake" item, but that
      // item has NO modifier lists attached in the catalog — so we can't
      // reference the catalog object (an ITEM id, not a variation id) or the
      // modifier option ids. Emit as an ad-hoc named line with the selected
      // modifiers folded into the name so the POS ticket prints correctly.
      // item.price already includes all modifier upcharges from the cart.
      // Deluxe preset toppings print as the preset label ("Deluxe" / "Deluxe,
      // no Tomato") instead of a raw topping list.
      const mods = formatItemModifiers(item).join(', ');
      return {
        name: mods ? `${item.name || 'Item'} (${mods})` : (item.name || 'Item'),
        quantity: String(item.quantity || 1),
        base_price_money: {
          amount: Math.round((item.price || 0) * 100),
          currency: 'USD',
        },
      };
    });

    // Send tax as a real order-level tax (not a service charge) so Square
    // shows it once in its standard Tax line instead of a second tax-looking row.
    const itemsSubtotal = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    // Loyalty reward discount as an order-level fixed discount so the Square
    // total matches what the customer actually paid.
    const orderDiscounts = [];
    if (discount > 0) {
      orderDiscounts.push({
        uid: 'loyalty-reward',
        name: 'Loyalty Reward',
        type: 'FIXED_AMOUNT',
        amount_money: { amount: Math.round(discount * 100), currency: 'USD' },
        scope: 'ORDER',
      });
    }
    // Happy Hour drink discount as a separate order-level fixed discount so
    // reporting can track it independently from loyalty rewards.
    if (happyHourDiscount > 0) {
      orderDiscounts.push({
        uid: 'happy-hour',
        name: 'Happy Hour 50% Off Drinks',
        type: 'FIXED_AMOUNT',
        amount_money: { amount: Math.round(happyHourDiscount * 100), currency: 'USD' },
        scope: 'ORDER',
      });
    }
    // Square applies the ADDITIVE tax to the post-discount amount, so base the
    // percentage on the discounted subtotal to keep the applied tax equal to ours.
    const taxBase = itemsSubtotal - (discount || 0) - (happyHourDiscount || 0);
    const orderTaxes = [];
    if (tax > 0 && taxBase > 0) {
      const pct = ((tax / taxBase) * 100).toFixed(2);
      orderTaxes.push({
        uid: 'sales-tax',
        name: 'Sales Tax',
        type: 'ADDITIVE',
        percentage: pct,
        scope: 'ORDER',
      });
    }

    // Delivery fee stays a fixed-amount service charge.
    const serviceCharges = [];
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
        ...(orderDiscounts.length > 0 ? { discounts: orderDiscounts } : {}),
        ...(orderTaxes.length > 0 ? { taxes: orderTaxes } : {}),
        ...(serviceCharges.length > 0 ? { service_charges: serviceCharges } : {}),
        metadata: {
          customer_email: customer.email,
          order_source: 'flavor-isle-website',
          order_type: orderType,
          ...(orderId ? { app_order_id: orderId } : {}),
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
      // Release the claim so the order can be retried by autoSyncUnpushedOrders
      if (orderId) {
        try {
          await base44.asServiceRole.entities.Order.updateMany(
            { id: orderId, square_sync_claimed_at: { $ne: null } },
            { $unset: { square_sync_claimed_at: "" } }
          );
        } catch (e) {
          console.warn('Failed to release Square sync claim:', e.message);
        }
      }
      return Response.json({ error: 'Square order creation failed', details: data }, { status: 500 });
    }

    console.log('Square order created:', data.order?.id);

    // Persist square_order_id on the app order immediately so concurrent
    // triggers see it and skip. This narrows the race window to just the
    // Square API call duration.
    if (orderId && data.order?.id) {
      try {
        await base44.asServiceRole.entities.Order.update(orderId, { square_order_id: data.order.id });
        console.log(`App order ${orderNumber} updated with square_order_id ${data.order.id}`);
      } catch (updateErr) {
        console.error('Failed to update app order with square_order_id:', updateErr.message);
      }
    }

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
          idempotency_key: orderId ? `flavor-isle-payment-${orderId}` : crypto.randomUUID(),
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

    return Response.json({ order_id: data.order?.id, order: data.order, already_synced: false });
  } catch (error) {
    console.error('Square order error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});