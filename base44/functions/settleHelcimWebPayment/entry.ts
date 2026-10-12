import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { settleHelcimCheckoutOrder, settleHelcimMerchOrder } from '../../shared/helcimSettlement.ts';

// Settlement for the Helcim secure page (issue #97, Part B step 9).
//
// Called from two places, exactly like the Square one:
//   1. the page our own secure checkout returns to, so a paid order reaches the
//      kitchen the moment the customer comes back, and
//   2. the auto-sync sweeper, so an order still settles when the customer closed
//      the tab without coming back.
//
// It never trusts the browser: Helcim is asked what it actually took for this
// order's own invoice number, and only an APPROVED payment for the exact total
// is passed to the kitchen.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const orderNumber = body?.order_number ? String(body.order_number) : '';
    const transactionId = body?.transaction_id ? String(body.transaction_id) : '';
    if (!orderNumber) {
      return Response.json({ error: 'order_number is required' }, { status: 400 });
    }

    // ── Tasty Threads merch, matched first: its numbers and its fulfilment are
    // its own, and only a verified payment releases it to Printful ──
    const merch = await base44.asServiceRole.entities.MerchOrder
      .filter({ order_number: orderNumber })
      .catch(() => []);
    if (merch?.length) {
      const result = await settleHelcimMerchOrder(base44, merch[0], transactionId || undefined);
      if (result.ok) {
        return Response.json({ ok: true, settled: true, order_number: orderNumber, provider: 'helcim', merch: true });
      }
      return Response.json({ ok: false, settled: false, order_number: orderNumber, provider: 'helcim', merch: true, reason: result.reason });
    }

    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber });
    const order = orders?.[0];
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }
    if (order.payment_provider !== 'helcim') {
      return Response.json({ error: 'This order does not pay through Helcim' }, { status: 400 });
    }
    if (order.payment_status === 'paid') {
      return Response.json({ ok: true, settled: true, already_paid: true, order_number: orderNumber, provider: 'helcim' });
    }
    if (order.status === 'cancelled' || order.payment_status === 'refunded') {
      return Response.json({ ok: false, settled: false, order_number: orderNumber, reason: 'This order is no longer open.' });
    }

    const settled = await settleHelcimCheckoutOrder(base44, order, transactionId || undefined);
    if (settled?.payment_status === 'paid') {
      return Response.json({ ok: true, settled: true, order_number: orderNumber, provider: 'helcim' });
    }
    return Response.json({
      ok: false,
      settled: false,
      order_number: orderNumber,
      provider: 'helcim',
      reason: 'Helcim has not recorded a completed payment for this order yet.',
    });
  } catch (error) {
    console.error('settleHelcimWebPayment error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}