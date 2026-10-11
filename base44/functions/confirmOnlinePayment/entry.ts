import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.25.0';
import { pushOrderToSquareAndKitchen } from '../../shared/fulfillOrder.ts';
import { verifyAndSettleGroupOrder } from '../../shared/groupPaymentSettlement.ts';
import { isPhoneOrder, phoneIntentMatchesOrder } from '../../shared/phoneOrderPricing.ts';
import { toCents } from '../../shared/taxMath.ts';

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
// The id stored on a web order is a PaymentIntent (pi_...) for the Payment
// Element flow or a Checkout Session (cs_...) for hosted/embedded checkout.
// Either way Stripe must show a succeeded USD payment for exactly this total.
async function webPaymentMatchesOrder(stripe, order) {
  const id = String(order?.stripe_session_id || '');
  const expected = toCents(order?.total);
  if (!id || !expected) return false;
  try {
    if (id.startsWith('pi_')) {
      const intent = await stripe.paymentIntents.retrieve(id);
      if (intent.status !== 'succeeded') return false;
      if (String(intent.currency || '').toLowerCase() !== 'usd') return false;
      return Number(intent.amount_received ?? intent.amount) === expected;
    }
    if (id.startsWith('cs_')) {
      const session = await stripe.checkout.sessions.retrieve(id);
      if (session.payment_status !== 'paid') return false;
      if (String(session.currency || '').toLowerCase() !== 'usd') return false;
      return Number(session.amount_total) === expected;
    }
  } catch (e) {
    console.error('Payment verification failed:', e.message);
    return false;
  }
  return false;
}

export default async function(req) {
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
    if (order.pay_cash_on_pickup) return Response.json({ skipped: true, reason: 'Cash must be collected and recorded by staff at pickup.' });

    // Group/split orders: never settle on the client's word. Verify every
    // share succeeded at the correct amount via Stripe, then settle the parent
    // order only when all shares are confirmed. Legacy group orders (no shares)
    // are NOT retroactively marked paid without payment evidence. The webhook's
    // per-share handler settles independently; both paths rely on
    // pushOrderToSquareAndKitchen's per-action dedupe so a race never
    // double-pushes or double-notifies.
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

    // Phone orders are public-link orders: never mark one paid on the caller's
    // word. Stripe must show a succeeded USD payment for the stored total.
    if (isPhoneOrder(order) && order.payment_status !== 'paid') {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
      const intent = order.stripe_session_id?.startsWith('pi_') ? await stripe.paymentIntents.retrieve(order.stripe_session_id) : null;
      if (!intent || !phoneIntentMatchesOrder(order, intent)) {
        return Response.json({ skipped: true, reason: 'payment not confirmed' });
      }
    }

    // Every remaining order (the live web checkout) must prove its payment as
    // well: look up the charge Stripe recorded for this order and require a
    // succeeded USD payment for exactly the stored total. Previously this
    // endpoint marked any order paid on the caller's word, which let anyone
    // confirm an unpaid order into Square + the kitchen for free.
    if (order.payment_status !== 'paid') {
      const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
      if (!await webPaymentMatchesOrder(stripe, order)) {
        console.warn(`confirmOnlinePayment: no verified payment for order ${order.order_number}`);
        return Response.json({ skipped: true, reason: 'payment not confirmed' }, { status: 400 });
      }
    }

    // Mark paid + confirmed if the webhook hasn't already.
    if (order.payment_status !== 'paid' || order.status === 'pending') {
      await base44.asServiceRole.entities.Order.update(order.id, {
        payment_status: 'paid',
        status: 'confirmed',
      });
      console.log(`Order ${order.order_number} confirmed via client fallback`);
    }

    // Always call pushOrderToSquareAndKitchen — per-action dedupe inside
    // handles the Square push (skips if square_order_id already set) and the
    // emails (independent atomic claims via staff_alert_sent_at /
    // confirmation_email_sent_at). This ensures emails fire exactly once even
    // if the webhook already pushed to Square but failed to send emails.
    await pushOrderToSquareAndKitchen(base44, { ...order, payment_status: 'paid', status: 'confirmed' });

    return Response.json({ ok: true, order_number: order.order_number });
  } catch (error) {
    console.error('confirmOnlinePayment error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}