import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { helcimConfigured, HELCIM_NOT_CONFIGURED } from '../../shared/helcimCheckout.ts';
import { payWithHelcimCard } from '../../shared/helcimVault.ts';
import { settleHelcimCheckoutOrder } from '../../shared/helcimSettlement.ts';

// Pay a pending Helcim order with a card the customer already saved (issue #97,
// Part B step 14).
//
// Only ever used when the checkout is on Helcim and Helcim holds the saved card.
// The charge is attempted for the order's own saved total — no amount comes from
// the request — and the order only settles once the charge is approved and the
// settling pass re-verifies the payment against Helcim.
//
// Fail closed: with no Helcim credentials this refuses plainly and the checkout
// keeps the customer on the card page instead.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: 'Sign in to use a saved card' }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const orderNumber = body?.order_number ? String(body.order_number) : '';
    const cardToken = body?.card_token ? String(body.card_token) : '';
    const cardId = body?.card_id ? String(body.card_id) : '';
    if (!orderNumber) return Response.json({ error: 'order_number is required' }, { status: 400 });
    if (!cardToken && !cardId) return Response.json({ error: 'card_id is required' }, { status: 400 });
    if (!helcimConfigured()) {
      return Response.json({ error: HELCIM_NOT_CONFIGURED }, { status: 409 });
    }

    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber });
    const order = orders?.[0];
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });
    if (order.payment_provider !== 'helcim') {
      return Response.json({ error: 'This order does not pay through Helcim' }, { status: 400 });
    }
    if (order.payment_status === 'paid') {
      return Response.json({ ok: true, settled: true, already_paid: true });
    }
    if (order.status === 'cancelled' || order.payment_status === 'refunded') {
      return Response.json({ error: 'This order is no longer open.' }, { status: 409 });
    }

    // The amount is the order's own saved total — never anything the browser sent.
    const charge = await payWithHelcimCard({
      cardToken,
      amountUsd: Number(order.total) || 0,
      invoiceNumber: order.id,
    });
    if (!charge?.transactionId || (charge.status && charge.status !== 'APPROVED')) {
      return Response.json({ error: 'That card could not be charged. Please try another card.' }, { status: 402 });
    }

    // Re-verify against Helcim before anything reaches the kitchen, exactly as a
    // page payment would be verified.
    const settled = await settleHelcimCheckoutOrder(base44, order, charge.transactionId);
    if (settled?.payment_status === 'paid') {
      return Response.json({ ok: true, settled: true, order_number: orderNumber, total: settled.total });
    }
    return Response.json({ ok: false, settled: false, reason: 'The charge did not match the order total — nothing was sent to the kitchen.' }, { status: 409 });
  } catch (error) {
    console.error('payWithSavedCard error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}