import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { pushOrderToSquareAndKitchen } from '../../shared/fulfillOrder.ts';

// Self-healing safety net for the order → Square sync.
//
// The customer's own return to the confirmation page is the primary trigger, but
// it can fail silently (a tab closed before the settle call, a network error, a
// function timeout). When that happens the order sits as "pending" forever and
// the kitchen never sees it — which is exactly what the user has been hitting.
//
// This function runs on a schedule (every few minutes via a workflow), finds
// recent online orders that were paid but never reached Square POS, and pushes
// them. Every provider-backed order is settled by asking the processor that took
// the money — Square or our own card processor — whether it holds a completed
// payment for the exact total, so a failed payment is never turned into a free
// kitchen order.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);

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

      // Square secure-page orders (issue #95). The customer pays on the hosted
      // page and returns to us, but if they close the tab nothing would ever
      // settle the order. Ask the settling pass whether Square holds a completed
      // payment for the exact total, and let it do the same single push the
      // customer's return path does — including the order-completion bonuses.
      if (order.payment_provider === 'square' && !order.square_order_id && order.payment_status === 'pending') {
        try {
          const settleRes = await base44.asServiceRole.functions.invoke('settleSquareWebPayment', {
            order_number: String(order.order_number),
          });
          const data = settleRes?.data || settleRes;
          if (data?.settled) {
            pushed++;
            results.push({ order_number: order.order_number, pushed: true, provider: 'square' });
          } else {
            skipped++;
            results.push({ order_number: order.order_number, skipped: true, reason: data?.reason || 'Square payment not completed yet' });
          }
        } catch (err) {
          skipped++;
          results.push({ order_number: order.order_number, skipped: true, reason: `Square settle failed: ${err.message}` });
        }
        continue;
      }

      // Card secure-page orders (issue #97). The same safety net as the Square
      // block above: if the customer closed the tab after paying, ask the
      // settling pass whether the processor holds a completed payment for the exact
      // total, and let it do the single push the customer's return path does.
      if (order.payment_provider === 'helcim' && !order.square_order_id && order.payment_status === 'pending') {
        try {
          const settleRes = await base44.asServiceRole.functions.invoke('settleHelcimWebPayment', {
            order_number: String(order.order_number),
          });
          const data = settleRes?.data || settleRes;
          if (data?.settled) {
            pushed++;
            results.push({ order_number: order.order_number, pushed: true, provider: 'helcim' });
          } else {
            skipped++;
            results.push({ order_number: order.order_number, skipped: true, reason: data?.reason || 'Card payment not completed yet' });
          }
        } catch (err) {
          skipped++;
          results.push({ order_number: order.order_number, skipped: true, reason: `Card payment check failed: ${err.message}` });
        }
        continue;
      }

      if (order.square_order_id) {
        // Square push already done — payment was verified when it pushed.
        // Just retry the missing emails (pushOrderToSquareAndKitchen skips the
        // push and tries the emails with per-action dedupe).
        paymentConfirmed = true;
      } else if (order.payment_status === 'paid') {
        // Webhook marked it paid but it never reached Square — push it.
        paymentConfirmed = true;
      }

      if (!paymentConfirmed) {
        skipped++;
        continue;
      }

      // The shared push is idempotent — it re-reads the order and skips the Square
      // push when square_order_id is already set — and handles the rest: mark paid
      // + confirmed, send to Square, fire the kitchen printer, notify
      // customer/staff. Called directly here: the Stripe-only verifier this used to
      // go through is gone, and the processor that took the money was asked above.
      try {
        if (order.payment_status !== 'paid' || order.status === 'pending') {
          await base44.asServiceRole.entities.Order.update(order.id, { payment_status: 'paid', status: 'confirmed' });
        }
        await pushOrderToSquareAndKitchen(base44, { ...order, payment_status: 'paid', status: order.status === 'pending' ? 'confirmed' : order.status });
        pushed++;
        results.push({ order_number: order.order_number, pushed: true });
      } catch (err) {
        results.push({ order_number: order.order_number, pushed: false, error: err.message });
      }
    }

    // Tasty Threads merch paid on either secure page gets the same safety net: a
    // customer who never returns to the confirmation page would otherwise leave
    // their order unpaid and never handed to production.
    const merchCandidates = await base44.asServiceRole.entities.MerchOrder.filter(
      { payment_status: 'pending', payment_provider: { $in: ['square', 'helcim'] } }, '-created_date', 20
    );
    let merchSettled = 0;
    for (const merchOrder of (merchCandidates || [])) {
      if (!merchOrder.created_date || new Date(merchOrder.created_date).getTime() <= twoHoursAgo) continue;
      const settleFunction = merchOrder.payment_provider === 'helcim'
        ? 'settleHelcimWebPayment'
        : 'settleSquareWebPayment';
      try {
        const settleRes = await base44.asServiceRole.functions.invoke(settleFunction, {
          order_number: String(merchOrder.order_number),
        });
        const data = settleRes?.data || settleRes;
        if (data?.settled) {
          merchSettled++;
          results.push({
            order_number: merchOrder.order_number,
            pushed: true,
            provider: merchOrder.payment_provider,
            merch: true,
          });
        }
      } catch (err) {
        console.warn(`Merch ${merchOrder.payment_provider} settle failed for ${merchOrder.order_number}:`, err.message);
      }
    }

    return Response.json({ ok: true, checked: candidates.length, pushed, skipped, merch_settled: merchSettled, results });
  } catch (error) {
    console.error('autoSyncUnpushedOrders error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}