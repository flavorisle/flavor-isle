import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { TIP_EDITABLE_INTENT_STATUSES, findOrderByNumber, verifyPhoneOrderTip } from '../../shared/phonePay.ts';

// Applies the customer's tip on the /pay page. The browser may ask for a tip;
// it can never ask for a total — the amount is rebuilt here from the stored
// order (subtotal + tax + delivery fee + tip) and written to the PaymentIntent,
// so what gets charged matches what the Order says, before the webhook pushes
// it to Square and the kitchen.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const order = await findOrderByNumber(base44, body.order_number);

    if (!order) {
      return Response.json(
        { error: 'We could not find that order. Check the order number in your text, or call us at (270) 563-4618.' },
        { status: 404 },
      );
    }
    if (order.payment_status === 'paid') {
      return Response.json({ error: 'This order is already paid.' }, { status: 409 });
    }
    if (!order.stripe_session_id) {
      return Response.json(
        { error: 'This order is set to be paid at the counter, so no tip can be added here.' },
        { status: 409 },
      );
    }

    const verified = verifyPhoneOrderTip(order, body?.tip);
    if (!verified.ok) {
      return Response.json({ error: verified.error }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const intent = await stripe.paymentIntents.retrieve(order.stripe_session_id);
    if (!TIP_EDITABLE_INTENT_STATUSES.includes(intent.status)) {
      return Response.json({ error: 'This payment can no longer be changed.' }, { status: 409 });
    }

    const updated = await stripe.paymentIntents.update(intent.id, {
      amount: Math.round(verified.total * 100),
      metadata: { ...(intent.metadata || {}), tip_amount: verified.tip.toFixed(2) },
    });

    // Record it on the order before the charge can settle: the webhook pushes
    // this record to Square, so the tip and total have to be on it already.
    try {
      await base44.asServiceRole.entities.Order.update(order.id, { tip: verified.tip, total: verified.total });
    } catch (orderErr) {
      console.error(
        `Phone pay: tip ${verified.tip} applied to intent ${intent.id} but order ${order.order_number} failed to update:`,
        orderErr.message,
      );
      return Response.json({ error: 'We could not save that tip. Please try again.' }, { status: 500 });
    }

    return Response.json({
      ok: true,
      tip: verified.tip,
      total: verified.total,
      clientSecret: updated.client_secret,
    });
  } catch (error) {
    console.error('applyPhoneOrderTip error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}