import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendMerchConfirmationEmail } from '../../shared/sendMerchEmails.ts';
import { pushOrderToSquareAndKitchen } from '../../shared/fulfillOrder.ts';

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
          // Skip if already pushed by the client-side confirmOnlinePayment
          // fallback (or the payment_intent.succeeded handler) to avoid a
          // duplicate Square order and repeat notifications.
          if (order.square_order_id) {
            console.log(`Order ${order.order_number} already pushed to Square — skipping checkout.session.completed push`);
          } else {
            await pushOrderToSquareAndKitchen(base44, { ...order, ...updates });
          }
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
          // Confirmation email for the merch order.
          try {
            await sendMerchConfirmationEmail({ ...mo, payment_status: 'paid' });
          } catch (mailErr) {
            console.error('Merch confirmation email failed:', mailErr.message);
          }
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
        // Skip if already pushed to Square by the client-side confirmOnlinePayment
        // fallback or the checkout.session.completed handler — prevents the
        // duplicate Square order that occurs when both triggers fire ~1s apart.
        if (order.square_order_id) {
          console.log(`Order ${order.order_number} already pushed to Square (${order.square_order_id}) — skipping payment_intent.succeeded push`);
        } else if (order.payment_status !== 'paid') {
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