import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { pushOrderToSquareAndKitchen } from '../../shared/fulfillOrder.ts';

// Client-side payment confirmation fallback.
//
// The Stripe webhook (checkout.session.completed / payment_intent.succeeded) is
// the primary trigger for pushing a paid order to Square POS. But webhook
// delivery is unreliable — events arrive late or sometimes not at all, and
// group/split orders use stripe_session_id 'GROUP' so the webhook can never
// match them. When that happens the order sits as "pending" forever and the
// kitchen never sees it.
//
// This function is the safety net. The checkout page calls it the instant
// Stripe confirms the payment on the client (stripe.confirmCardPayment returns
// status 'succeeded'). It marks the order paid + confirmed and pushes it to
// Square + the kitchen printer + customer/staff notifications.
//
// Idempotency: pushOrderToSquareAndKitchen re-reads the order and skips if
// square_order_id is already set, so it's safe when both this fallback and the
// webhook fire for the same order — only the first one pushes, the second is a
// no-op.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderNumber } = await req.json();
    if (!orderNumber) {
      return Response.json({ error: 'orderNumber is required' }, { status: 400 });
    }

    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: String(orderNumber) });
    if (!orders || orders.length === 0) {
      return Response.json({ skipped: true, reason: 'order not found' });
    }
    const order = orders[0];

    // Already fully processed (webhook won the race) — nothing to do.
    if (order.square_order_id) {
      return Response.json({ skipped: true, reason: 'already pushed to Square', square_order_id: order.square_order_id });
    }

    // Mark paid + confirmed if the webhook hasn't already.
    if (order.payment_status !== 'paid' || order.status === 'pending') {
      await base44.asServiceRole.entities.Order.update(order.id, {
        payment_status: 'paid',
        status: 'confirmed',
      });
      console.log(`Order ${order.order_number} confirmed via client fallback`);
    }

    // Push to Square + kitchen + notifications. Idempotent — skips if
    // square_order_id is already set by the time it re-reads the order.
    await pushOrderToSquareAndKitchen(base44, { ...order, payment_status: 'paid', status: 'confirmed' });

    return Response.json({ ok: true, order_number: order.order_number });
  } catch (error) {
    console.error('confirmOnlinePayment error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});