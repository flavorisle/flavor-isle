import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.25.0';
import { pushOrderToSquareAndKitchen } from '../../shared/fulfillOrder.ts';
import { verifyAndSettleGroupOrder } from '../../shared/groupPaymentSettlement.ts';
import { settleSquarePhonePayment } from '../../shared/settleSquarePhonePayment.ts';

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
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId, paymentReference } = await req.json();
    if (!orderId) {
      return Response.json({ error: 'orderId is required' }, { status: 400 });
    }

    const order = await base44.asServiceRole.entities.Order.get(String(orderId));
    if (!order) return Response.json({ skipped: true, reason: 'order not found' }, { status: 404 });
    if (order.pay_cash_on_pickup) return Response.json({ skipped: true, reason: 'Cash must be collected and recorded by staff at pickup.' });
    if (order.status === 'cancelled' || order.payment_status === 'refunded') {
      return Response.json({ error: 'This order is no longer payable.' }, { status: 409 });
    }

    // A group order has no parent intent; verify every stored share directly
    // with Stripe before settling it.
    if (order.stripe_session_id === 'GROUP') {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
      const result = await verifyAndSettleGroupOrder(base44, stripe, order.id);
      if (!result.ok) {
        return Response.json({
          ok: false,
          partial: !!result.partial,
          reason: result.reason || (result.partial ? 'Not all split payments have succeeded yet — please wait for each person to pay, then try again.' : 'We could not verify all split payments. Please try again or contact us.'),
          shares: result.shares,
        }, { status: 400 });
      }
      return Response.json({ ok: true, order_number: order.order_number, group: true });
    }

    if (order.payment_provider === 'square') {
      if (!order.square_checkout_order_id) {
        return Response.json({ error: 'Square payment details are unavailable for this order.' }, { status: 409 });
      }
      const settled = await settleSquarePhonePayment(base44, order, null, { forceVerify: true });
      if (settled.payment_status !== 'paid') {
        return Response.json({ error: 'Square has not confirmed payment for this order.' }, { status: 409 });
      }
      return Response.json({ ok: true, order_number: order.order_number });
    }

    const reference = String(order.stripe_session_id || '');
    if (!reference || (paymentReference && paymentReference !== reference)) {
      return Response.json({ error: 'Payment reference does not match this order.' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    let paymentVerified = false;
    if (reference.startsWith('pi_')) {
      const intent = await stripe.paymentIntents.retrieve(reference);
      paymentVerified =
        intent.status === 'succeeded' &&
        intent.currency === 'usd' &&
        Number(intent.amount_received) === Math.round(Number(order.total) * 100);
    } else if (reference.startsWith('cs_')) {
      const session = await stripe.checkout.sessions.retrieve(reference);
      paymentVerified =
        session.payment_status === 'paid' &&
        session.currency === 'usd' &&
        Number(session.amount_total) === Math.round(Number(order.total) * 100);
    }
    if (!paymentVerified) {
      return Response.json({ error: 'Stripe has not confirmed the full payment for this order.' }, { status: 409 });
    }

    const updates = {
      payment_status: 'paid',
      ...(order.status === 'pending' ? { status: 'confirmed' } : {}),
    };
    if (order.payment_status !== 'paid' || order.status === 'pending') {
      await base44.asServiceRole.entities.Order.update(order.id, updates);
      console.log(`Order ${order.order_number} confirmed after processor verification`);
    }
    await pushOrderToSquareAndKitchen(base44, { ...order, ...updates });
    return Response.json({ ok: true, order_number: order.order_number });
  } catch (error) {
    console.error('confirmOnlinePayment error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}