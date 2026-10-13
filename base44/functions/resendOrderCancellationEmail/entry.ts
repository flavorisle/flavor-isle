import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendCancellationEmail } from '../../shared/cancelOrderFlow.ts';

// Admin-only: resend the cancellation email for one order, for when a customer
// calls about a cancellation they never saw, or wants to be told again why the
// order came off the board.
//
// Email only on purpose: this issues no refund, and no text rides along with it.
// The body and sender are the same ones the automatic notice uses.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const orderId = body.order_id;
    if (!orderId) return Response.json({ error: 'order_id is required' }, { status: 400 });

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (!order.customer_email) {
      return Response.json({ error: `Order ${order.order_number} has no customer email on it, so there is nowhere to send this.` }, { status: 400 });
    }
    // Only a cancelled order can send a cancellation notice — anything else would
    // tell the customer their order was cancelled when it was not.
    if (order.status !== 'cancelled') {
      return Response.json({ error: `Order ${order.order_number} is not cancelled, so there is no cancellation notice to send.` }, { status: 400 });
    }

    // A reason the crew types for this resend becomes the order's reason, so the
    // customer reads it and the order card keeps the same wording.
    const reason = String(body.reason ?? '').trim().slice(0, 300);
    if (reason && reason !== (order.cancel_reason || '')) {
      await base44.asServiceRole.entities.Order.update(order.id, { cancel_reason: reason });
    }
    const sendOrder = reason ? { ...order, cancel_reason: reason } : order;

    const result = await sendCancellationEmail(base44, sendOrder, { refunded: body.refunded === true });
    if (result !== 'sent') {
      console.error(`Cancellation email resend failed for order ${order.order_number}: ${result}`);
      return Response.json({ error: result || 'The cancellation email could not be sent.' }, { status: 502 });
    }

    // Stamp the resend so the order card shows the customer was told.
    await base44.asServiceRole.entities.Order.update(order.id, { cancellation_email_sent_at: new Date().toISOString() });

    return Response.json({ success: true, message: `Cancellation email sent to ${order.customer_email}` });
  } catch (error) {
    console.error('resendOrderCancellationEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}