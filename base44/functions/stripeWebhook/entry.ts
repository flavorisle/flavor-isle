import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
    const paymentStatus = session.payment_status; // 'paid' or 'unpaid'

    console.log(`checkout.session.completed: ${stripeSessionId}, payment_status: ${paymentStatus}`);

    try {
      const orders = await base44.asServiceRole.entities.Order.filter({ stripe_session_id: stripeSessionId });
      if (orders && orders.length > 0) {
        const order = orders[0];
        const updates = { payment_status: paymentStatus === 'paid' ? 'paid' : 'pending' };
        // Move from pending → confirmed once payment is confirmed
        if (paymentStatus === 'paid' && order.status === 'pending') {
          updates.status = 'confirmed';
        }
        await base44.asServiceRole.entities.Order.update(order.id, updates);
        console.log(`Order ${order.order_number} updated: payment_status=${updates.payment_status}, status=${updates.status || order.status}`);
      } else {
        console.warn('No Order found for stripe_session_id:', stripeSessionId);
      }
    } catch (dbErr) {
      console.error('DB update error:', dbErr.message);
    }
  }

  return Response.json({ received: true });
});