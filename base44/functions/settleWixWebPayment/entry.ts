import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { isInternalCaller } from '../../shared/internalRelay.ts';
import { settleWixWebOrder } from '../../shared/wixWebSettlement.ts';

// Settlement for the website's secure payment page when it is set to Base44
// Payments (powered by Wix) — issue #98, part A.
//
// There are exactly two intended callers:
//
//   1. The platform's ORDER_APPROVED webhook (payments-webhook). It verifies the
//      provider's signature, resolves the pending purchase it wrote when the
//      checkout session was created, and calls the shared settlement directly —
//      never through this route.
//   2. The App Payment automation — "a payment succeeded" → this function — which
//      carries only the provider's own event facts (payment id, amount, process).
//
// This route is deliberately NOT open. Marking an order paid is the one action
// that hands free food to the kitchen, so a caller must either be trusted —
// a signed-in admin, or our own server code presenting the relay key (the crew
// re-running one settlement by hand) — or name a provider payment that the
// platform itself recorded a purchase for. That purchase row can only be written
// by the platform's create-checkout, and it is what carries the order number the
// payment was opened for; an unpaid order can therefore never be settled from
// outside, and every settlement is still checked against the order's own saved
// total before anything is marked paid.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      order_number = '',
      checkout_session_id = '',
      provider_transaction_id = '',
      amount_cents = null,
      provider = '',
      relay_key = '',
    } = body || {};

    const { error: authError } = await requireAdmin(base44);
    const privileged = !authError || isInternalCaller(req, { relay_key });

    let orderNumber = String(order_number || '').trim();
    let checkoutId = String(checkout_session_id || '');
    let wixOrderId = String(provider_transaction_id || '');
    // The automation reports money in cents (the platform's payment-event
    // convention); the stored order total is in dollars.
    let paidAmount = amount_cents == null ? null : Number(amount_cents) / 100;

    if (orderNumber && !privileged) {
      return Response.json({ error: 'Not allowed' }, { status: 403 });
    }

    if (!orderNumber) {
      // The payment event names the payment, not our order. Resolve it through
      // the purchase row the platform wrote for that exact payment: its productId
      // carries the order number the checkout was opened for.
      if (!wixOrderId) {
        return Response.json({ error: 'order_number or provider_transaction_id is required' }, { status: 400 });
      }
      const purchases = await base44.asServiceRole.entities.Base44Purchase.filter({ orderId: wixOrderId });
      const purchase = (purchases || [])[0];
      if (!purchase) {
        // Usually just ordering: the platform's own webhook links the payment to
        // the purchase, and this automation can arrive first. Reported, not thrown
        // as a failure — the webhook path settles the order either way, and a
        // redelivery of the event resolves here.
        console.warn(`settleWixWebPayment: no purchase recorded yet for payment ${wixOrderId} (provider ${provider || 'unknown'})`);
        return Response.json({ ok: false, reason: 'unmatched', message: 'No purchase recorded for that payment yet.' });
      }
      orderNumber = String(purchase.productId || '').replace(/^order:/, '');
      checkoutId = purchase.checkoutSessionId || checkoutId;
      // Fall back to the amount the checkout itself was opened for when the event
      // does not carry one; the order total is still re-checked below.
      if (paidAmount == null && purchase.amount != null) paidAmount = Number(purchase.amount);
    }

    const result = await settleWixWebOrder(base44, {
      orderNumber,
      checkoutSessionId: checkoutId,
      wixOrderId,
      amount: paidAmount,
    });

    if (!result.ok) {
      console.error(`settleWixWebPayment failed for order ${orderNumber}: ${result.error}`);
      return Response.json({ ok: false, error: result.error }, { status: 409 });
    }

    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error('settleWixWebPayment error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}