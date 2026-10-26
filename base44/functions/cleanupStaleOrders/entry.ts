import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isPhoneOrder } from '../../shared/phoneOrderPricing.ts';
import { maintenanceGate } from '../../shared/maintenanceGate.ts';

// End-of-night cleanup for abandoned checkouts.
//
// An online order is saved BEFORE the customer pays. When the payment never
// completes (the page was closed, the card was declined, the form never loaded)
// the order sits as "pending" forever: it never reached Square, never alerted the
// kitchen, and never took a cent. Those dead rows pile up on the register and
// hide the real abandoned checkouts.
//
// This closes them. It NEVER touches an order that was actually paid: before it
// closes anything it asks the same settlement the confirmation page uses, so a
// payment that landed is settled and pushed instead of being thrown away. Phone
// orders whose pay link was never created are closed. Orders belonging to no
// payment path at all are skipped: their own sync owns them.
//
// Runs nightly after close via the "End of Night Order Cleanup" workflow. Safe to
// run by hand: { "dryRun": true } previews without changing anything, and an admin
// (or a caller holding the app relay key) may pass { "olderThanMinutes": 1 } to
// sweep the whole backlog in one pass. The age threshold is NOT caller-chosen for
// anyone else — see the clamp below.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // This endpoint closes live checkout attempts, so it is not open to
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

      // Ask the processor that took the money for the truth first. These are the
      // same settlement calls the confirmation page and the nightly safety net
      // use: a payment that landed is settled, pushed to Square and the kitchen,
      // and left alone; a payment that never landed lets the order be closed.
      const settleFn = {
        square: 'settleSquareWebPayment',
        wix: 'settleWixWebPayment',
      }[order.payment_provider];
      if (settleFn) {
        try {
          const res = await base44.asServiceRole.functions.invoke(settleFn, {
            order_number: String(order.order_number),
          });
          const data = res?.data || res;
          if (data?.settled || data?.already_paid) {
            kept.push({ order_number: order.order_number, reason: 'payment was received — settled and pushed, left alone' });
            continue;
          }
        } catch (err) {
          // The processor could not be asked, so nothing is touched: a failed
          // lookup must never close a checkout that might be paid.
          kept.push({ order_number: order.order_number, reason: `${order.payment_provider} check failed: ${err.message}` });
          continue;
        }
      } else if (!isPhoneOrder(order)) {
        kept.push({ order_number: order.order_number, reason: 'not an online card order — left to its own flow' });
        continue;
      }

      // Nothing was taken, and nothing can be charged now: close it. A phone
      // order whose pay link was never created lands here too — there was never
      // anything to pay.
      if (dryRun) {
        closed.push({
          order_number: order.order_number,
          total: order.total,
          customer: order.customer_name,
          created: order.created_date,
        });
        continue;
      }

      await base44.asServiceRole.entities.Order.update(order.id, { status: 'cancelled' });
      console.log(`Closed abandoned checkout ${order.order_number} ($${order.total}) — no payment received`);
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