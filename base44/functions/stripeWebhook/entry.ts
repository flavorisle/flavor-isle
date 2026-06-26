import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Resend } from 'npm:resend@3.2.0';

async function sendOrderConfirmationEmail(order) {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

  const itemsHtml = (order.items || []).map(item =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0e8d0;">${item.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0e8d0;text-align:right;">$${(item.price * (item.quantity || 1)).toFixed(2)}</td>
    </tr>`
  ).join('');

  const orderTypeLabel = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' }[order.order_type] || order.order_type;

  const html = `
    <div style="font-family:'Open Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fffdf8;">
      <div style="background:#C0392B;padding:32px 24px;text-align:center;">
        <h1 style="color:white;font-family:Arial,sans-serif;margin:0;font-size:28px;letter-spacing:2px;">FLAVOR ISLE</h1>
        <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Smiths Grove, KY</p>
      </div>

      <div style="padding:32px 24px;">
        <h2 style="color:#141414;font-size:22px;margin:0 0 4px;">Order Confirmed! 🎉</h2>
        <p style="color:#666;margin:0 0 24px;">Thanks ${order.customer_name}, your order <strong>#${order.order_number}</strong> is confirmed and being prepared.</p>

        <div style="background:#f5edd6;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;color:#1A3A5C;"><strong>Order Type:</strong> ${orderTypeLabel}</p>
          ${order.delivery_address ? `<p style="margin:6px 0 0;font-size:14px;color:#1A3A5C;"><strong>Delivery Address:</strong> ${order.delivery_address}</p>` : ''}
          ${order.table_number ? `<p style="margin:6px 0 0;font-size:14px;color:#1A3A5C;"><strong>Table:</strong> ${order.table_number}</p>` : ''}
          ${order.special_instructions ? `<p style="margin:6px 0 0;font-size:14px;color:#1A3A5C;"><strong>Special Instructions:</strong> ${order.special_instructions}</p>` : ''}
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px 0;border-bottom:2px solid #C0392B;color:#141414;font-size:13px;">Item</th>
              <th style="text-align:right;padding:8px 0;border-bottom:2px solid #C0392B;color:#141414;font-size:13px;">Price</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:4px 0;color:#666;font-size:14px;">Subtotal</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.subtotal || 0).toFixed(2)}</td></tr>
          ${order.delivery_fee > 0 ? `<tr><td style="padding:4px 0;color:#666;font-size:14px;">Delivery Fee</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.delivery_fee || 0).toFixed(2)}</td></tr>` : ''}
          <tr><td style="padding:4px 0;color:#666;font-size:14px;">Tax</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.tax || 0).toFixed(2)}</td></tr>
          <tr><td style="padding:8px 0 0;color:#141414;font-size:16px;font-weight:bold;border-top:2px solid #f0e8d0;">Total</td><td style="text-align:right;padding:8px 0 0;color:#C0392B;font-size:18px;font-weight:bold;border-top:2px solid #f0e8d0;">$${(order.total || 0).toFixed(2)}</td></tr>
        </table>

        <div style="text-align:center;background:#1A3A5C;border-radius:12px;padding:20px;">
          <p style="color:white;margin:0;font-size:15px;">Questions? Call us at <a href="tel:+12805634618" style="color:#f5edd6;">(280) 563-4618</a></p>
          <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;">103 N Main St, Smiths Grove, KY 42171</p>
        </div>
      </div>

      <div style="text-align:center;padding:16px;color:#aaa;font-size:12px;">
        © 2024 Flavor Isle. All rights reserved.
      </div>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: 'Flavor Isle <onboarding@resend.dev>',
    to: order.customer_email,
    subject: `Order Confirmed — #${order.order_number} 🍔`,
    html,
  });

  if (error) {
    console.error('Resend email error:', error);
  } else {
    console.log(`Order confirmation email sent to ${order.customer_email}`);
  }
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
          // Send to Square POS
          try {
            await base44.functions.invoke('createSquareOrder', {
              items: order.items || [],
              orderType: order.order_type || 'pickup',
              customer: {
                name: order.customer_name,
                phone: order.customer_phone,
                email: order.customer_email,
                address: order.delivery_address,
              },
              instructions: order.special_instructions || '',
              total: order.total,
            });
            console.log(`Order ${order.order_number} sent to Square`);
            
            // Alert kitchen printer
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
          } catch (squareErr) {
            console.error('Failed to send order to Square:', squareErr.message);
          }
          
          if (order.customer_email) {
            await sendOrderConfirmationEmail(order);
          }
        }
      } else {
        console.warn('No Order found for stripe_session_id:', stripeSessionId);
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
          await base44.asServiceRole.entities.Order.update(order.id, { payment_status: 'paid', status: 'confirmed' });
          console.log(`Order ${order.order_number} marked paid via payment_intent.succeeded`);
          if (order.customer_email) {
            await sendOrderConfirmationEmail({ ...order, payment_status: 'paid', status: 'confirmed' });
          }
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