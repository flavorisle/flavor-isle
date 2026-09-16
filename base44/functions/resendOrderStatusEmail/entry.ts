import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendOrderPreparingEmail, sendOrderReadyEmail, sendOrderCompletedEmail } from '../../shared/sendOrderEmails.ts';
import { sendOrderConfirmationEmail } from '../../shared/fulfillOrder.ts';

// Admin-only: resend any order status email for a specific order. Used when
// the original email failed to send (e.g. a transient Resend API error that
// the 3-retry loop couldn't recover from).
// email_type: 'confirmed' | 'preparing' | 'ready' | 'completed'
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const orderId = body.order_id;
    const emailType = body.email_type || 'ready';
    if (!orderId) return Response.json({ error: 'order_id is required' }, { status: 400 });

    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (!order.customer_email) return Response.json({ error: 'Order has no customer email' }, { status: 400 });

    let message = '';
    switch (emailType) {
      case 'confirmed':
        await sendOrderConfirmationEmail(base44, order, null);
        message = `Confirmation email resent to ${order.customer_email}`;
        break;
      case 'preparing':
        await sendOrderPreparingEmail(order, base44);
        message = `Preparing email resent to ${order.customer_email}`;
        break;
      case 'ready':
        await sendOrderReadyEmail(order, base44);
        message = `Order ready email resent to ${order.customer_email}`;
        break;
      case 'completed':
        await sendOrderCompletedEmail(order, base44);
        message = `Completed email resent to ${order.customer_email}`;
        break;
      default:
        return Response.json({ error: 'Invalid email_type. Use: confirmed, preparing, ready, or completed' }, { status: 400 });
    }

    return Response.json({ success: true, message });
  } catch (error) {
    console.error('resendOrderStatusEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}