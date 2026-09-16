import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendOrderConfirmationEmail } from '../../shared/fulfillOrder.ts';

// Admin-only: resend the order confirmation email for a specific order.
// Used when the original confirmation email failed to send (e.g. a
// transient Resend API error that the 3-retry loop couldn't recover from).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const orderId = body.order_id;
    if (!orderId) return Response.json({ error: 'order_id is required' }, { status: 400 });

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (!order.customer_email) return Response.json({ error: 'Order has no customer email' }, { status: 400 });

    await sendOrderConfirmationEmail(base44, order, null);

    return Response.json({ success: true, message: `Confirmation email resent to ${order.customer_email}` });
  } catch (error) {
    console.error('resendOrderConfirmation error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}