import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isPhoneOrder, phoneIntentMatchesOrder } from '../../shared/phoneOrderPricing.ts';

// Self-healing safety net for the order → Square sync.
//
// The Stripe webhook + client-side confirmOnlinePayment fallback are the
// primary triggers, but both can fail silently (webhook not delivered, client
// network error, function timeout). When that happens the order sits as
// "pending" forever and the kitchen never sees it — which is exactly what the
// user has been hitting.
//
// This function runs on a schedule (every few minutes via a workflow), finds
// recent online orders that were paid but never reached Square POS, and pushes
// them. It verifies with Stripe that the payment actually succeeded before
// pushing, so a failed payment is never turned into a free kitchen order.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    // Recent orders, newest first
    const orders = await base44.asServiceRole.entities.Order.list('-created_date', 60);
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;

    // Clear stale sync claims (>5 min old with no square_order_id) so orders
    // whose createSquareOrder call crashed or timed out can be retried.
    for (const o of (orders || [])) {
      if (o.square_sync_claimed_at && !o.square_order_id && new Date(o.square_sync_claimed_at).getTime() < fiveMinAgo) {
        try {
          await base44.asServiceRole.entities.Order.updateMany(
            { id: o.id, square_sync_claimed_at: o.square_sync_claimed_at },
            { $unset: { square_sync_claimed_at: "" } }
          );
          console.log(`Cleared stale sync claim for order ${o.order_number}`);
        } catch (e) {
          console.warn(`Failed to clear stale claim for ${o.order_number}:`, e.message);
        }
      }
    }

    // Candidates: orders that need either a Square push or an email retry.
    // 1. No square_order_id yet — needs full push + emails.
    // 2. Has square_order_id but missing confirmation_email_sent_at or
    //    staff_alert_sent_at — Square push done but emails failed; retry emails
    //    only (pushOrderToSquareAndKitchen skips the push, tries emails).
    // Phone/chat orders taken without an email carry a placeholder address —
    // there is no confirmation email to retry, so they must not stay in this
    // list forever (that re-processed them every few minutes).
    const hasRealEmail = (o: any) => !!o.customer_email && o.customer_email !== 'phone-order@flavorisle.com';

    const candidates = (orders || []).filter((o) =>
      o.status !== 'cancelled' &&
      !o.pay_cash_on_pickup &&
      o.order_source !== 'in_store' &&
      o.created_date && new Date(o.created_date).getTime() > twoHoursAgo &&
      (
        !o.square_order_id ||
        (o.square_order_id && (!o.staff_alert_sent_at || (hasRealEmail(o) && !o.confirmation_email_sent_at)))
      )
    );

    let pushed = 0;
    let skipped = 0;
    const results = [];

    for (const order of candidates) {
      let paymentConfirmed = false;

      if (order.square_order_id) {
        // Square push already done — payment was verified when it pushed.
        // Just retry the missing emails (confirmOnlinePayment → pushOrderToSquareAndKitchen
        // skips the push, tries emails with per-action dedupe).
        paymentConfirmed = true;
      } else if (order.payment_status === 'paid') {
        // Webhook marked it paid but it never reached Square — push it.
        paymentConfirmed = true;
      } else if (order.payment_status === 'pending' && order.stripe_session_id?.startsWith('pi_')) {
        // Webhook never fired — verify with Stripe that the payment succeeded
        // before pushing, so a failed/declined payment doesn't become a free order.
        // This is also what settles a phone order whose customer paid and never
        // returned to the /pay page.
        try {
          const pi = await stripe.paymentIntents.retrieve(order.stripe_session_id);
          if (pi.status === 'succeeded' && isPhoneOrder(order) && !phoneIntentMatchesOrder(order, pi)) {
            results.push({ order_number: order.order_number, skipped: true, reason: 'Phone order payment amount/currency does not match the order total' });
          } else if (pi.status === 'succeeded') {
            paymentConfirmed = true;
          } else {
            results.push({ order_number: order.order_number, skipped: true, reason: `Stripe PI status: ${pi.status}` });
          }
        } catch (err) {
          results.push({ order_number: order.order_number, skipped: true, reason: `Stripe lookup failed: ${err.message}` });
        }
      } else if (order.payment_status === 'pending' && order.stripe_session_id?.startsWith('cs_')) {
        // Phone/chat orders pay through a Stripe Checkout Session. If the
        // checkout.session.completed webhook never arrived, verify the session
        // with Stripe before pushing so an unpaid order never reaches the kitchen.
        try {
          const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
          if (session.payment_status === 'paid') {
            paymentConfirmed = true;
          } else {
            results.push({ order_number: order.order_number, skipped: true, reason: `Stripe session payment_status: ${session.payment_status}` });
          }
        } catch (err) {
          results.push({ order_number: order.order_number, skipped: true, reason: `Stripe session lookup failed: ${err.message}` });
        }
      }

      if (!paymentConfirmed) {
        skipped++;
        continue;
      }

      // confirmOnlinePayment is idempotent (skips if square_order_id is already
      // set by the time it re-reads) and handles the full push: mark paid +
      // confirmed, send to Square, fire kitchen printer, notify customer/staff.
      try {
        await base44.asServiceRole.functions.invoke('confirmOnlinePayment', {
          orderNumber: String(order.order_number),
        });
        pushed++;
        results.push({ order_number: order.order_number, pushed: true });
      } catch (err) {
        results.push({ order_number: order.order_number, pushed: false, error: err.message });
      }
    }

    return Response.json({ ok: true, checked: candidates.length, pushed, skipped, results });
  } catch (error) {
    console.error('autoSyncUnpushedOrders error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}