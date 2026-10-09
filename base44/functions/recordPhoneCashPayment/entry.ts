import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { settleCashPickupPayment } from '../../shared/settleCashPickupPayment.ts';
import { pushOrderToSquareAndKitchen } from '../../shared/fulfillOrder.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.error) return auth.error;
    const body = await req.json();
    if (!body.order_id || body.cash_received !== true) return Response.json({ error: 'Select an order and confirm cash has been received.' }, { status: 400 });
    let order = await base44.asServiceRole.entities.Order.get(body.order_id);
    if (!order?.pay_cash_on_pickup || order.order_type !== 'pickup') return Response.json({ error: 'This is not a cash pickup order.' }, { status: 400 });
    if (order.status === 'cancelled' || order.payment_status === 'refunded') return Response.json({ error: 'This order cannot accept payment.' }, { status: 409 });
    if (!order.square_order_id) {
      await pushOrderToSquareAndKitchen(base44, order);
      order = await base44.asServiceRole.entities.Order.get(order.id);
    }
    if (!order.square_order_id) return Response.json({ error: 'Square has not received this order yet. Retry before recording payment.' }, { status: 503 });
    const paid = await settleCashPickupPayment(base44, order, true);
    return Response.json({ success: paid.payment_status === 'paid', message: 'Cash payment recorded in Square.', payment_status: paid.payment_status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}