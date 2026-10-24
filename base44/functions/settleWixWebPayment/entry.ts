import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { settleWixPhonePayment, settleWixMerchOrder } from '../../shared/wixWebSettlement.ts';

// Settlement for the Base44 Payments (Wix) secure page — issue #116, Part A step 6.
//
// Called from two places, exactly like the Square one:
//   1. the page our own secure checkout returns to, so a paid order reaches the
//      kitchen the moment the customer comes back, and
//   2. the auto-sync sweeper, so an order still settles when the customer closed
//      the tab without coming back.
//
// It never trusts the browser: the platform's own purchase record is asked whether
// this order's checkout session was paid, and only a payment matching the saved total
// to the cent is passed to the kitchen.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const orderNumber = body?.order_number ? String(body.order_number) : '';
    if (!orderNumber) {
      return Response.json({ error: 'order_number is required' }, { status: 400 });
    }

    // ── Tasty Threads merch, matched first: only a verified payment releases it
    // to Printful ──
    const merch = await base44.asServiceRole.entities.MerchOrder
      .filter({ order_number: orderNumber })
      .catch(() => []);
    if (merch?.length) {
      const result = await settleWixMerchOrder(base44, merch[0]);
      return Response.json({ ...result, order_number: orderNumber, provider: 'wix', merch: true });
    }

    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber });
    const order = orders?.[0];
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    if (order.payment_provider !== 'wix') {
      return Response.json({ error: 'This order does not pay through the platform checkout' }, { status: 400 });
    }
    if (order.payment_status === 'paid') {
      return Response.json({ ok: true, settled: true, already_paid: true, order_number: orderNumber, provider: 'wix' });
    }
    if (order.status === 'cancelled' || order.payment_status === 'refunded') {
      return Response.json({ ok: false, settled: false, order_number: orderNumber, reason: 'This order is no longer open.' });
    }

    const settled = await settleWixPhonePayment(base44, order);
    if (settled?.payment_status === 'paid') {
      return Response.json({ ok: true, settled: true, order_number: orderNumber, provider: 'wix' });
    }
    return Response.json({
      ok: false,
      settled: false,
      order_number: orderNumber,
      provider: 'wix',
      reason: 'The payment for this order has not been confirmed yet.',
    });
  } catch (error) {
    console.error('settleWixWebPayment error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}