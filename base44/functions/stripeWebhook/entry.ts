import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@3.2.0';
import { sendSmashieSms, smashieSmsTemplates } from '../../shared/sendSmashieSms.ts';
import { brandedEmailHtml, merchPromoHtml } from '../../shared/sendOrderEmails.ts';
import { accrueForOrder, redeemReward } from '../../shared/squareLoyalty.ts';
import { sendPushToEmail } from '../../shared/sendPush.ts';

async function sendOrderConfirmationEmail(order) {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

  const itemsHtml = (order.items || []).map(item =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0e8d0;">${item.name}${(item.quantity || 1) > 1 ? ` x${item.quantity}` : ''}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0e8d0;text-align:right;">$${(item.price * (item.quantity || 1)).toFixed(2)}</td>
    </tr>`
  ).join('');

  const orderTypeLabel = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' }[order.order_type] || order.order_type;
  const fulfillmentLine = order.order_type === 'delivery' && order.delivery_address
    ? `Delivery to ${order.delivery_address}`
    : order.order_type === 'dine_in' && order.table_number
      ? `Dine-In · Table ${order.table_number}`
      : orderTypeLabel;
  const estTime = order.estimated_time ? `${order.estimated_time} min` : '—';

  const html = brandedEmailHtml(`
        <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey fam,</p>
        <h2 style="color:#141414;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 4px;">${order.customer_name} — your order is locked in. 🎉</h2>
        <p style="color:#141414;font-size:17px;line-height:1.5;margin:6px 0 24px;">Everything's lined up just how you like it, and the crew's already firing up the grill. 🔥</p>

        <div style="background:#1A3A5C;color:white;border-radius:12px;padding:14px 20px;margin-bottom:24px;text-align:center;letter-spacing:3px;font-family:'Oswald',Arial,sans-serif;font-size:15px;font-weight:bold;">
          ORDER CONFIRMED · #${order.order_number || ''}
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px 0;border-bottom:2px solid #C0392B;color:#141414;font-size:13px;">ITEM</th>
              <th style="text-align:right;padding:8px 0;border-bottom:2px solid #C0392B;color:#141414;font-size:13px;">PRICE</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:4px 0;color:#666;font-size:14px;">Subtotal</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.subtotal || 0).toFixed(2)}</td></tr>
          ${order.delivery_fee > 0 ? `<tr><td style="padding:4px 0;color:#666;font-size:14px;">Delivery Fee</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.delivery_fee || 0).toFixed(2)}</td></tr>` : ''}
          <tr><td style="padding:4px 0;color:#666;font-size:14px;">Tax</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.tax || 0).toFixed(2)}</td></tr>
          <tr><td style="padding:8px 0 0;color:#141414;font-size:16px;font-weight:bold;border-top:2px solid #f0e8d0;">Total</td><td style="text-align:right;padding:8px 0 0;color:#C0392B;font-size:18px;font-weight:bold;border-top:2px solid #f0e8d0;">$${(order.total || 0).toFixed(2)}</td></tr>
        </table>

        <div style="background:#f5edd6;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;color:#1A3A5C;"><strong>Pickup/Delivery:</strong> ${fulfillmentLine}</p>
          <p style="margin:6px 0 0;font-size:14px;color:#1A3A5C;"><strong>Order Time:</strong> ~${estTime}</p>
          ${order.special_instructions ? `<p style="margin:6px 0 0;font-size:14px;color:#1A3A5C;"><strong>Notes:</strong> ${order.special_instructions}</p>` : ''}
        </div>

        <p style="color:#141414;font-size:17px;margin:0 0 10px;">You're all set — we'll hit you up the second it's ready. 🔔</p>
        <p style="color:#666;margin:0;font-size:14px;">— Smashie & The Flavor Isle Team 🍔</p>
        ${merchPromoHtml()}
  `);

  const { error } = await resend.emails.send({
    from: 'Flavor Isle <smashie@order.flavor-isle.com>',
    to: order.customer_email,
    subject: `Order locked in — #${order.order_number} 🍔`,
    html,
  });

  if (error) {
    console.error('Resend email error:', error);
  } else {
    console.log(`Order confirmation email sent to ${order.customer_email}`);
  }
}

// Owner receipt — sends a copy of the online order receipt to the store owner
// the moment a web order is paid, so the kitchen/owner has a full record.
async function sendAdminReceiptEmail(order) {
  const OWNER_EMAIL = 'wesleyrbooker1@gmail.com';
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

  const itemsHtml = (order.items || []).map(item => {
    const qty = item.quantity || 1;
    const mods = (item.selectedModifiers || []).map(m => m.name || m).join(', ');
    const modLine = mods ? `<div style="font-size:12px;color:#666;margin:2px 0 0;">+ ${mods}</div>` : '';
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0e8d0;">${item.name}${qty > 1 ? ` x${qty}` : ''}${modLine}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0e8d0;text-align:right;">$${(item.price * qty).toFixed(2)}</td>
    </tr>`;
  }).join('');

  const orderTypeLabel = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' }[order.order_type] || order.order_type;
  const fulfillmentLine = order.order_type === 'delivery' && order.delivery_address
    ? `Delivery to ${order.delivery_address}`
    : order.order_type === 'dine_in' && order.table_number
      ? `Dine-In · Table ${order.table_number}`
      : orderTypeLabel;
  const estTime = order.estimated_time ? `${order.estimated_time} min` : '—';
  const scheduled = order.scheduled_for ? new Date(order.scheduled_for).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: '2-digit' }) : 'ASAP';

  const html = brandedEmailHtml(`
        <h2 style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 4px;">🧾 New Online Order</h2>
        <p style="color:#141414;font-size:17px;line-height:1.5;margin:6px 0 20px;">A web order just came in and was paid online.</p>

        <div style="background:#1A3A5C;color:white;border-radius:12px;padding:14px 20px;margin-bottom:20px;text-align:center;letter-spacing:3px;font-family:'Oswald',Arial,sans-serif;font-size:15px;font-weight:bold;">
          ORDER #${order.order_number || ''}
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          <tr><td style="padding:3px 0;color:#666;font-size:14px;">Customer</td><td style="text-align:right;color:#141414;font-size:14px;">${order.customer_name || '—'}</td></tr>
          <tr><td style="padding:3px 0;color:#666;font-size:14px;">Email</td><td style="text-align:right;color:#141414;font-size:14px;">${order.customer_email || '—'}</td></tr>
          <tr><td style="padding:3px 0;color:#666;font-size:14px;">Phone</td><td style="text-align:right;color:#141414;font-size:14px;">${order.customer_phone || '—'}</td></tr>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px 0;border-bottom:2px solid #C0392B;color:#141414;font-size:13px;">ITEM</th>
              <th style="text-align:right;padding:8px 0;border-bottom:2px solid #C0392B;color:#141414;font-size:13px;">PRICE</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:4px 0;color:#666;font-size:14px;">Subtotal</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.subtotal || 0).toFixed(2)}</td></tr>
          ${order.delivery_fee > 0 ? `<tr><td style="padding:4px 0;color:#666;font-size:14px;">Delivery Fee</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.delivery_fee || 0).toFixed(2)}</td></tr>` : ''}
          ${order.tip > 0 ? `<tr><td style="padding:4px 0;color:#666;font-size:14px;">Tip</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.tip || 0).toFixed(2)}</td></tr>` : ''}
          ${order.discount > 0 ? `<tr><td style="padding:4px 0;color:#666;font-size:14px;">Discount</td><td style="text-align:right;color:#666;font-size:14px;">−$${(order.discount || 0).toFixed(2)}</td></tr>` : ''}
          <tr><td style="padding:4px 0;color:#666;font-size:14px;">Tax</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.tax || 0).toFixed(2)}</td></tr>
          <tr><td style="padding:8px 0 0;color:#141414;font-size:16px;font-weight:bold;border-top:2px solid #f0e8d0;">Total Paid</td><td style="text-align:right;padding:8px 0 0;color:#C0392B;font-size:18px;font-weight:bold;border-top:2px solid #f0e8d0;">$${(order.total || 0).toFixed(2)}</td></tr>
        </table>

        <div style="background:#f5edd6;border-radius:12px;padding:16px 20px;margin-bottom:8px;">
          <p style="margin:0;font-size:14px;color:#1A3A5C;"><strong>Fulfillment:</strong> ${fulfillmentLine}</p>
          <p style="margin:6px 0 0;font-size:14px;color:#1A3A5C;"><strong>Ready:</strong> ${scheduled} (~${estTime})</p>
          ${order.special_instructions ? `<p style="margin:6px 0 0;font-size:14px;color:#1A3A5C;"><strong>Notes:</strong> ${order.special_instructions}</p>` : ''}
        </div>
  `);

  const { error } = await resend.emails.send({
    from: 'Flavor Isle <smashie@order.flavor-isle.com>',
    to: OWNER_EMAIL,
    subject: `🧾 New online order #${order.order_number || ''} — $${(order.total || 0).toFixed(2)}`,
    html,
  });

  if (error) {
    console.error('Admin receipt email error:', error);
  } else {
    console.log(`Admin receipt sent to ${OWNER_EMAIL} for order ${order.order_number}`);
  }
}

// Loyalty: consume any applied legacy reward, then accrue Square Star Rewards
// points for the paid Square order into the customer's loyalty account (the
// same in-store program). Points are computed by Square from the order's spend
// per the program's accrual rules.
async function processLoyalty(base44, order, squareOrderId) {
  try {
    if (order.redemption_id) {
      try {
        await redeemReward({
          email: order.customer_email,
          phone: order.customer_phone,
          rewardTierId: order.redemption_id,
          idempotencyKey: `${order.id}:${order.redemption_id}`,
        });
        console.log(`Reward tier ${order.redemption_id} redeemed for order ${order.order_number}`);
      } catch (redeemErr) {
        console.error('Square loyalty redemption failed:', redeemErr.message);
      }
    }

    if (!squareOrderId || !order.customer_email) return;
    await accrueForOrder({ squareOrderId, email: order.customer_email, phone: order.customer_phone });
    console.log(`Square Star Rewards points accrued for order ${order.order_number}`);
  } catch (err) {
    console.error('Square loyalty accrual failed:', err.message);
  }
}

// Route a newly paid order to Square POS so staff can track and update its
// status, persist the returned Square order id so later status syncs can
// match the record back, alert the kitchen printer, and email the customer.
async function pushOrderToSquareAndKitchen(base44, order) {
  try {
    const squareRes = await base44.functions.invoke('createSquareOrder', {
      items: order.items || [],
      orderType: order.order_type || 'pickup',
      orderNumber: order.order_number,
      customer: {
        name: order.customer_name,
        phone: order.customer_phone,
        email: order.customer_email,
        address: order.delivery_address,
      },
      instructions: order.special_instructions || '',
      total: order.total,
      tax: order.tax || 0,
      deliveryFee: order.delivery_fee || 0,
      tip: order.tip || 0,
      discount: order.discount || 0,
    });
    const squareOrderId = squareRes?.data?.order_id || squareRes?.order_id;
    if (squareOrderId) {
      await base44.asServiceRole.entities.Order.update(order.id, { square_order_id: squareOrderId });
      console.log(`Order ${order.order_number} sent to Square (id ${squareOrderId})`);
    } else {
      console.log(`Order ${order.order_number} sent to Square (no id returned)`);
    }
  } catch (squareErr) {
    console.error('Failed to send order to Square:', squareErr.message);
  }

  try {
    await base44.functions.invoke('printKitchenOrder', {
      order_number: order.order_number,
      items: order.items || [],
      special_instructions: order.special_instructions || '',
      order_type: order.order_type,
    });
  } catch (printerErr) {
    console.warn('Kitchen printer alert failed:', printerErr.message);
  }

  if (order.customer_email && order.customer_email !== 'phone-order@flavorisle.com') {
    await sendOrderConfirmationEmail(order);
  }

  // Send a copy of the receipt to the owner so the store has a full record.
  await sendAdminReceiptEmail(order);

  // Confirmed SMS — sent the moment payment lands and the order goes confirmed.
  if (order.customer_phone) {
    await sendSmashieSms(order.customer_phone, smashieSmsTemplates.confirmed(order));
  }

  // Confirmed push — fires the instant payment lands, alongside the email/SMS.
  if (order.customer_email) {
    try {
      await sendPushToEmail(base44, order.customer_email, {
        title: '🍔 Order locked in!',
        body: `Hey ${order.customer_name || 'fam'}, order #${order.order_number || ''} is confirmed — the crew's firing up the grill. We'll ping you as it moves along!`,
        url: '/account',
        tag: `order-${order.id}`,
      });
    } catch (pushErr) {
      console.warn('Confirmed push failed:', pushErr.message);
    }
  }

  // Loyalty: consume applied reward + accrue Square Star Rewards for this order.
  await processLoyalty(base44, order, squareOrderId);
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event;
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const stripeSessionId = session.id;
    const paymentStatus = session.payment_status;

    console.log(`checkout.session.completed: ${stripeSessionId}, payment_status: ${paymentStatus}`);

    try {
      const orders = await base44.asServiceRole.entities.Order.filter({ stripe_session_id: stripeSessionId });
      if (orders && orders.length > 0) {
        const order = orders[0];
        const updates = { payment_status: paymentStatus === 'paid' ? 'paid' : 'pending' };
        if (paymentStatus === 'paid' && order.status === 'pending') {
          updates.status = 'confirmed';
        }
        await base44.asServiceRole.entities.Order.update(order.id, updates);
        console.log(`Order ${order.order_number} updated: payment_status=${updates.payment_status}, status=${updates.status || order.status}`);

        if (paymentStatus === 'paid') {
          await pushOrderToSquareAndKitchen(base44, order);
        }
      } else {
        // Merch order — paid merch orders are fulfilled by Printful.
        const merchOrders = await base44.asServiceRole.entities.MerchOrder.filter({ stripe_session_id: stripeSessionId });
        if (merchOrders && merchOrders.length > 0) {
          const mo = merchOrders[0];
          await base44.asServiceRole.entities.MerchOrder.update(mo.id, {
            payment_status: 'paid',
            fulfillment_status: 'paid',
          });
          console.log(`Merch order ${mo.order_number} marked paid`);
          try {
            await base44.functions.invoke('createPrintfulOrder', { merchOrderId: mo.id });
            console.log(`Printful order placed for merch order ${mo.order_number}`);
          } catch (pfErr) {
            console.error('Printful order placement failed:', pfErr.message);
          }
        } else {
          console.warn('No Order or MerchOrder found for stripe_session_id:', stripeSessionId);
        }
      }
    } catch (dbErr) {
      console.error('DB update error:', dbErr.message);
    }
  }

  // Also handle payment_intent.succeeded (used by the Payment Element flow)
  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    console.log(`payment_intent.succeeded: ${pi.id}`);

    try {
      const orders = await base44.asServiceRole.entities.Order.filter({ stripe_session_id: pi.id });
      if (orders && orders.length > 0) {
        const order = orders[0];
        if (order.payment_status !== 'paid') {
          const paidOrder = { ...order, payment_status: 'paid', status: 'confirmed' };
          await base44.asServiceRole.entities.Order.update(order.id, { payment_status: 'paid', status: 'confirmed' });
          console.log(`Order ${order.order_number} marked paid via payment_intent.succeeded`);
          // Route to Square POS + kitchen, then email customer.
          await pushOrderToSquareAndKitchen(base44, paidOrder);
        }
      } else {
        console.warn('No Order found for payment_intent id:', pi.id);
      }
    } catch (err) {
      console.error('payment_intent.succeeded handler error:', err.message);
    }
  }

  return Response.json({ received: true });
});