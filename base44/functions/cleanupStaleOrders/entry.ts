import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isPhoneOrder } from '../../shared/phoneOrderPricing.ts';
import { maintenanceGate } from '../../shared/maintenanceGate.ts';

// End-of-night cleanup for abandoned checkouts.
//
// Every online order is saved with a Stripe PaymentIntent BEFORE the customer
// pays. When the payment step never completes (card form never loaded, wallet
// sheet failed, browser closed), the order sits as "pending" forever: it never
// reached Square, never alerted the kitchen, and never took a cent. Those dead
// rows pile up on the register and hide the real abandoned checkouts.
//
// This closes them. It NEVER touches an order that was actually paid — it asks
// Stripe for the truth first and skips anything that saw money, leaving a paid
// order that missed the webhook to autoSyncUnpushedOrders. Phone orders whose pay
// link was never created are closed. Orders that are not Stripe checkouts at all
// are skipped: their own provider sync owns them.
//
// Runs nightly after close via the "End of Night Order Cleanup" workflow. Safe to
// run by hand: { "dryRun": true } previews without changing anything, and an admin
// (or a caller holding the app relay key) may pass { "olderThanMinutes": 1 } to
// sweep the whole backlog in one pass. The age threshold is NOT caller-chosen for
// anyone else — see the clamp below.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const body = await req.json().catch(() => ({}));

    // This endpoint expires live Stripe PaymentIntents, so it is not open to
    // anonymous looping: the scheduled path is held to one run per half-hour
    // window, a signed-in caller must be an admin, and a manual run may present
    // the relay key. See shared/maintenanceGate.ts.
    const gate = await maintenanceGate(base44, req, body, {
      functionName: 'cleanupStaleOrders',
      windowMs: 30 * 60 * 1000,
    });
    if (!gate.ok) return gate.error;

    const dryRun = body?.dryRun === true;
    // Only orders that have had ample time to be paid AND pushed are eligible —
    // a live checkout is never touched. The threshold is fixed at an hour for every
    // ordinary caller: it used to be a request parameter, which let anyone pass
    // olderThanMinutes=1 and cancel legitimate checkouts that were still in
    // progress. Only an admin or a relay-key caller may widen the sweep.
    const requestedAge = gate.caller === 'scheduled' ? NaN : Number(body?.olderThanMinutes);
    const minAgeMinutes = Number.isFinite(requestedAge) && requestedAge > 0 ? requestedAge : 60;
    const cutoff = Date.now() - minAgeMinutes * 60 * 1000;

    // Anything still unpaid and pending is an abandoned attempt: a real payment
    // flips payment_status to paid within seconds, via the webhook or the
    // client-side fallback.
    const orders = await base44.asServiceRole.entities.Order.filter(
      { status: 'pending', payment_status: 'pending' },
      '-created_date',
      200,
    );

    const closed = [];
    const kept = [];

    for (const order of (orders || [])) {
      if (order.order_source === 'in_store') continue;
      if (order.square_order_id) continue;
      if (!order.created_date || new Date(order.created_date).getTime() > cutoff) continue;

      const ref = order.stripe_session_id;
      // A phone order with no Stripe ref never got a payable link (setup failed),
      // so nothing can be charged: close it. Hosted-page checkouts (Square,
      // Helcim) are left to their own status sync.
      if (!ref && isPhoneOrder(order) && !order.square_checkout_order_id) {
        if (!dryRun) await base44.asServiceRole.entities.Order.update(order.id, { status: 'cancelled' });
        closed.push({
          order_number: order.order_number,
          total: order.total,
          customer: order.customer_name,
          created: order.created_date,
        });
        continue;
      }

      // No Stripe reference at all: this is not a Stripe checkout (a hosted
      // Square or Helcim page carries its own reference), so the provider's own
      // status sync owns it and nothing here may expire it.
      if (!ref) {
        kept.push({ order_number: order.order_number, reason: 'not a Stripe checkout — left to the provider status sync' });
        continue;
      }

      // Ask Stripe what really happened before closing anything.
      let moneyReceived = false;
      let alreadyDead = false;
      try {
        if (ref.startsWith('pi_')) {
          const pi = await stripe.paymentIntents.retrieve(ref);
          moneyReceived = pi.status === 'succeeded' || Number(pi.amount_received || 0) > 0;
          alreadyDead = pi.status === 'canceled';
        } else if (ref.startsWith('cs_')) {
          const session = await stripe.checkout.sessions.retrieve(ref);
          moneyReceived = session.payment_status === 'paid';
          alreadyDead = session.status === 'expired';
        } else {
          kept.push({ order_number: order.order_number, reason: 'unrecognised payment reference' });
          continue;
        }
      } catch (err) {
        kept.push({ order_number: order.order_number, reason: `Stripe lookup failed: ${err.message}` });
        continue;
      }

      if (moneyReceived) {
        kept.push({ order_number: order.order_number, reason: 'payment was received — left for autoSyncUnpushedOrders' });
        continue;
      }

      if (dryRun) {
        closed.push({
          order_number: order.order_number,
          total: order.total,
          customer: order.customer_name,
          created: order.created_date,
        });
        continue;
      }

      // Nothing was ever taken: kill the dangling intent so it can never be
      // charged later, then close the order.
      if (!alreadyDead) {
        try {
          if (ref.startsWith('pi_')) await stripe.paymentIntents.cancel(ref);
          else await stripe.checkout.sessions.expire(ref);
        } catch (err) {
          console.warn(`Could not cancel ${ref} for order ${order.order_number}:`, err.message);
        }
      }

      await base44.asServiceRole.entities.Order.update(order.id, { status: 'cancelled' });
      console.log(`Closed abandoned checkout ${order.order_number} ($${order.total}) — no payment received, intent ${ref}`);
      closed.push({
        order_number: order.order_number,
        total: order.total,
        customer: order.customer_name,
        created: order.created_date,
      });
    }

    return Response.json({
      ok: true,
      dryRun,
      minAgeMinutes,
      scanned: (orders || []).length,
      closedCount: closed.length,
      closed,
      keptCount: kept.length,
      kept,
    });
  } catch (error) {
    console.error('cleanupStaleOrders error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}