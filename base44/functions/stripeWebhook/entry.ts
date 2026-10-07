import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendMerchConfirmationEmail } from '../../shared/sendMerchEmails.ts';
import { pushOrderToSquareAndKitchen } from '../../shared/fulfillOrder.ts';
import { isPhoneOrder, phoneIntentMatchesOrder } from '../../shared/phoneOrderPricing.ts';
import { updateGroupShareStatus, settleGroupOrderIfComplete } from '../../shared/groupPaymentSettlement.ts';

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
          // Always call pushOrderToSquareAndKitchen — per-action dedupe inside
          // handles the Square push (skips if square_order_id already set) and
          // the emails (independent atomic claims via staff_alert_sent_at /
          // confirmation_email_sent_at). This ensures emails fire exactly once
          // even if the first call pushed to Square but failed to send emails.
          await pushOrderToSquareAndKitchen(base44, { ...order, ...updates });
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
        // Phone orders settle only for the exact USD amount the order says was due.
        if (isPhoneOrder(order) && !phoneIntentMatchesOrder(order, pi)) {
          console.error(`Phone order ${order.order_number}: intent ${pi.id} (${pi.amount_received ?? pi.amount} ${pi.currency}) does not match order total ${order.total} — not settling`);
        } else {
          // Mark paid if the checkout.session.completed handler hasn't already.
          if (order.payment_status !== 'paid') {
            await base44.asServiceRole.entities.Order.update(order.id, { payment_status: 'paid', status: 'confirmed' });
            console.log(`Order ${order.order_number} marked paid via payment_intent.succeeded`);
          }
          // Always call pushOrderToSquareAndKitchen — per-action dedupe inside
          // handles the Square push (skips if already pushed) and the emails
          // (independent atomic claims). This ensures emails fire exactly once
          // even if the first call pushed to Square but failed to send emails.
          await pushOrderToSquareAndKitchen(base44, { ...order, payment_status: 'paid', status: 'confirmed' });
        }
      } else {
        console.warn('No Order found for payment_intent id:', pi.id);
      }
    } catch (err) {
      console.error('payment_intent.succeeded handler error:', err.message);
    }

    // Group/split settlement: match by intent id against GroupPaymentShare.
    // (Group orders carry stripe_session_id 'GROUP', so the single-order match
    // above never fires for them.) Idempotent — update the share status (with
    // amount verification), then settle the parent order only when ALL shares
    // succeeded at the correct amounts. No-op for single-order intents.
    try {
      const shareUpdate = await updateGroupShareStatus(base44, pi.id, 'succeeded', pi.amount_received ?? pi.amount ?? null);
      if (shareUpdate.found) {
        await settleGroupOrderIfComplete(base44, shareUpdate.share.order_id);
      }
    } catch (groupErr) {
      console.error('Group payment_intent.succeeded handler error:', groupErr.message);
    }
  }

  // Group/split: failed or canceled intent → mark the share so the parent
  // order never settles on a partial/failed group. No-op for single orders.
  if (event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
    const pi = event.data.object;
    try {
      await updateGroupShareStatus(base44, pi.id, event.type === 'payment_intent.payment_failed' ? 'failed' : 'canceled', null);
    } catch (groupErr) {
      console.error('Group payment intent failure handler error:', groupErr.message);
    }
  }

  // Group/split: refund → record on the share (informational; does not
  // auto-unsettle the already-fulfilled order). No-op for single orders.
  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const intentId = charge?.payment_intent;
    if (intentId) {
      try {
        await updateGroupShareStatus(base44, String(intentId), 'refunded', null);
      } catch (groupErr) {
        console.error('Group charge.refunded handler error:', groupErr.message);
      }
    }
  }

  return Response.json({ received: true });
});