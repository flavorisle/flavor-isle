import Stripe from 'npm:stripe@14.25.0';

// Full refund of an online order's Stripe PaymentIntent.
//
// Shared by refundOrder (refund on its own) and cancelOrder (cancel + refund in
// one step) so the Stripe call lives in exactly one place. Online card orders
// store their PaymentIntent id in stripe_session_id; anything else (Square
// tenders, cash at pickup) has no Stripe intent and must be refunded where it
// was tendered.
export function stripePaymentIntentId(order: any): string | null {
  const ref = order?.stripe_session_id;
  return ref && String(ref).startsWith('pi_') ? String(ref) : null;
}

export async function refundStripePaymentIntent(order: any, reason = 'requested_by_customer') {
  const paymentIntentId = stripePaymentIntentId(order);
  if (!paymentIntentId) throw new Error('No valid Stripe PaymentIntent found on order');
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  return await stripe.refunds.create({ payment_intent: paymentIntentId, reason });
}