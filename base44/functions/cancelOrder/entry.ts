import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { cancelSquareOrder, notifyOrderCancelled } from '../../shared/cancelOrderFlow.ts';
import { refundStripePaymentIntent, stripePaymentIntentId } from '../../shared/stripeRefund.ts';

// One-tap order cancellation for the crew, in the order the money moves:
//   1. cancel the Square order (so it leaves the POS + kitchen screen),
//   2. refund the card payment when there is one,
//   3. mark the order cancelled (status is terminal — the Square status sync in
//      orderTrackingStatus.advanceOrderStatus never moves a cancelled order on),
//   4. tell the customer what happened.
// Each step reports its own outcome, so a Square hiccup still leaves the refund
// and the customer notice done, and the crew sees exactly what needs a manual
// follow-up. Admin-only.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const body = await req.json().catch(() => ({}));
    const { order_id, reason = '' } = body || {};
    if (!order_id) return Response.json({ error: 'order_id is required' }, { status: 400 });

    // A missing id makes Order.get throw rather than return null — catch it so
    // the crew gets a plain "not found" instead of a 500.
    const order = await base44.asServiceRole.entities.Order.get(order_id).catch(() => null);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (order.status === 'cancelled') {
      return Response.json({ error: 'This order is already cancelled.', order_number: order.order_number }, { status: 409 });
    }

    // 1. Square — the API-created order (or the phone-checkout order before it
    //    is copied over). Best effort: a failure is reported, never fatal.
    const square = await cancelSquareOrder(base44, order.square_order_id || order.square_checkout_order_id);

    // 2. Refund. Online card orders are Stripe PaymentIntents; an order paid
    //    another way (Square tender, cash at pickup) is reported back so the
    //    crew refunds it where it was taken instead of us inventing a ledger.
    let refunded = false;
    let refundId: string | null = null;
    let refundNote = '';
    if (order.payment_status === 'paid') {
      if (stripePaymentIntentId(order)) {
        try {
          const refund = await refundStripePaymentIntent(order, 'requested_by_customer');
          refunded = true;
          refundId = refund.id;
        } catch (error) {
          refundNote = `Card refund failed (${(error as Error).message}) — refund it in Stripe.`;
          console.error(`Refund failed while cancelling order ${order.order_number}:`, (error as Error).message);
        }
      } else {
        refundNote = 'Not paid by card here — refund it in Square (or hand back the cash).';
      }
    } else {
      refundNote = 'No payment to refund';
    }

    // 3. Mark it cancelled. Written after the money so the record reflects the
    //    outcome; payment_status only flips to refunded once Stripe confirms.
    const patch: Record<string, unknown> = { status: 'cancelled' };
    if (refunded) patch.payment_status = 'refunded';
    const trimmedReason = String(reason || '').trim().slice(0, 300);
    if (trimmedReason) patch.cancel_reason = trimmedReason;
    await base44.asServiceRole.entities.Order.update(order_id, patch);

    // 4. Tell the customer.
    const notified = await notifyOrderCancelled(base44, { ...order, ...patch }, { refunded });

    return Response.json({
      status: 'ok',
      order_number: order.order_number,
      square: square.detail,
      square_cancelled: square.ok,
      refunded,
      refund_id: refundId,
      refund_note: refundNote,
      email: notified.email,
      sms: notified.sms,
    });
  } catch (error) {
    console.error('cancelOrder error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}