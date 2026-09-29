import Stripe from 'npm:stripe@14.25.0';
import { settleSquarePhonePayment } from '../../shared/settleSquarePhonePayment.ts';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import {
  TIP_EDITABLE_INTENT_STATUSES,
  findOrderByNumber,
  orderPaySummary,
  resolvePublishableKey,
} from '../../shared/phonePay.ts';

// Public read endpoint behind the phone-order short payment link — the link
// Smashie texts. It returns the customer's own order summary plus the
// PaymentIntent client secret so the page can mount the embedded card form.
//
// No auth on purpose: the customer is on their phone following a text link. The
// summary carries no address or phone number, and paying still requires the
// intent's client secret — knowing an order number alone can never charge
// anything.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    let order = await findOrderByNumber(base44, body.order_number);

    if (!order) {
      return Response.json(
        { error: 'We could not find that order. Check the order number in your text, or call us at (270) 563-4618.' },
        { status: 404 },
      );
    }

    if (order.payment_provider === 'square') order = await settleSquarePhonePayment(base44, order);
    const summary = orderPaySummary(order);

    if (order.payment_status === 'paid') {
      return Response.json({ ...summary, paid: true, payable: false });
    }

    if (order.status === 'cancelled' || order.payment_status === 'refunded') {
      return Response.json({ ...summary, paid: false, payable: false, reason: 'payment_closed' });
    }
    if (order.payment_provider === 'square') {
      return Response.json({ ...summary, paid: false, payable: !!order.payment_url, payment_provider: 'square', payment_url: order.payment_url });
    }

    // Payment setup failed when the order was taken: the
    // order is saved and the crew collects at the counter, so the page says so
    // instead of showing a form that cannot work.
    if (!order.stripe_session_id) {
      return Response.json({ ...summary, paid: false, payable: false, reason: 'no_payment_link' });
    }

    // Fail before the card form is offered: a missing key would leave the
    // customer staring at a page they cannot pay on.
    const publishableKey = resolvePublishableKey();
    if (!publishableKey) {
      return Response.json(
        { error: 'Payment is temporarily unavailable — nothing was charged. Please try again in a moment, or pay at the counter.' },
        { status: 503 },
      );
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    let intent;
    try {
      intent = await stripe.paymentIntents.retrieve(order.stripe_session_id);
    } catch (intentErr) {
      console.error(
        `Phone pay: intent ${order.stripe_session_id} unavailable for order ${order.order_number}:`,
        intentErr.message,
      );
      return Response.json({ ...summary, paid: false, payable: false, reason: 'no_payment_link' });
    }

    // Already paid — the webhook owns the order; the page just confirms it.
    if (intent.status === 'succeeded') {
      return Response.json({ ...summary, paid: true, payable: false, intent_status: intent.status });
    }
    if (!TIP_EDITABLE_INTENT_STATUSES.includes(intent.status)) {
      console.warn(`Phone pay: order ${order.order_number} intent is ${intent.status} — not payable on the page`);
      return Response.json({
        ...summary,
        paid: false,
        payable: false,
        reason: 'payment_closed',
        intent_status: intent.status,
      });
    }

    return Response.json({
      ...summary,
      paid: false,
      payable: true,
      intent_status: intent.status,
      amount_due: (Number(intent.amount) || 0) / 100,
      clientSecret: intent.client_secret,
      publishableKey,
    });
  } catch (error) {
    console.error('getPhoneOrderPayment error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}