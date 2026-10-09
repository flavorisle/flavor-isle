import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { sendOrderStatusSms } from '../../shared/sendOrderStatusSms.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const body = await req.json();

    const { order_id, order_number: requestedNumber } = body;
    const order_number = requestedNumber;

    if (!order_number && !order_id) {
      return Response.json({ error: 'Missing order_number or order_id' }, { status: 400 });
    }

    // Look up the real order — the phone number and order type always come from
    // the stored record, never from the request body.
    const order = order_id
      ? await base44.asServiceRole.entities.Order.get(order_id)
      : (await base44.asServiceRole.entities.Order.filter({ order_number }))[0];

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const customer_phone = order.customer_phone;
    const order_type = order.order_type;


    // Format message based on order type
    let message = '';
    if (order_type === 'delivery') {
      message = `🚗 Your Flavor Isle order #${order.order_number} is ready and on its way! Driver will arrive soon.`;
    } else if (order_type === 'dine_in') {
      message = `🪑 Your Flavor Isle order #${order.order_number} is ready! Head to your table.`;
    } else {
      // pickup or call_in
      message = `✅ Your Flavor Isle order #${order.order_number} is ready for pickup!`;
    }

    const outcome = await sendOrderStatusSms(base44, order, 'ready', { body: message });
    return Response.json({ success: outcome.sent, skipped: outcome.skipped, reason: outcome.reason || null, log_id: outcome.log_id,
      message: outcome.sent ? 'Text queued; delivery status is in the SMS Log.' : outcome.skipped ? 'Text skipped; see the SMS Log for the reason.' : 'Text failed; see the SMS Log for details.' });
  } catch (error) {
    console.error('sendOrderReadyAlert error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}