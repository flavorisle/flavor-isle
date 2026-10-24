import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { verifyPhoneOrderTip } from '../../shared/phonePay.ts';

// Put a tip on an unpaid order before its secure payment page is opened (issue #116).
//
// The customer picks the tip on our own /pay page, and the charge is then built from
// the STORED order — never from the browser — so the tip has to be written here, with
// the same cap the page uses. An order that is no longer open refuses.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const orderNumber = String(body?.order_number || '').trim();
    if (!orderNumber) return Response.json({ error: 'order_number is required' }, { status: 400 });

    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber });
    const order = orders?.[0];
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (order.payment_status === 'paid') return Response.json({ error: 'This order is already paid.' }, { status: 409 });
    if (order.status === 'cancelled' || order.payment_status === 'refunded') {
      return Response.json({ error: 'This order is no longer open.' }, { status: 409 });
    }
    if (order.pay_cash_on_pickup) return Response.json({ error: 'This order is paid in cash at pickup.' }, { status: 409 });

    const priced = verifyPhoneOrderTip(order, body?.tip);
    if (!priced.ok) return Response.json({ error: priced.error }, { status: 400 });

    await base44.asServiceRole.entities.Order.update(order.id, { tip: priced.tip, total: priced.total });
    return Response.json({ ok: true, order_number: order.order_number, tip: priced.tip, total: priced.total });
  } catch (error) {
    console.error('applyPhoneOrderTip error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}