import Stripe from 'npm:stripe@14.25.0';
import { expectedPhoneOrderCents, phonePayUrl } from './phoneOrderPricing.ts';
import { toCents } from './taxMath.ts';

// Default phone-order payment: a PaymentIntent paid on flavor-isle.com/pay/:orderNumber.
export async function createStripePhonePayment(base44, order) {
  // Never create a payment artifact for a total that disagrees with the saved pricing.
  if (!(toCents(order.total) > 0) || toCents(order.total) !== expectedPhoneOrderCents(order)) {
    throw new Error('Order total does not match its subtotal, tax, delivery fee and tip.');
  }
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  let intent = order.stripe_session_id ? await stripe.paymentIntents.retrieve(order.stripe_session_id) : null;
  if (intent && ['succeeded', 'processing'].includes(intent.status)) throw new Error('Payment has already completed or is processing. Do not send another link.');
  if (!intent || intent.status === 'canceled') {
    intent = await stripe.paymentIntents.create({
      amount: toCents(order.total), currency: 'usd', payment_method_types: ['card'],
      metadata: { base44_app_id: Deno.env.get('BASE44_APP_ID'), order_id: order.id, order_number: order.order_number, phone_order: 'true' },
      description: `Flavor Isle order #${order.order_number}`,
    }, { idempotencyKey: `phone-pay-${order.id}-${order.stripe_session_id || 'first'}` });
  }
  const paymentUrl = phonePayUrl(order.order_number);
  await base44.asServiceRole.entities.Order.update(order.id, {
    payment_provider: 'stripe', stripe_session_id: intent.id, payment_url: paymentUrl,
    manual_pay_required: false, square_payment_link_id: '', square_checkout_order_id: '',
  });
  return paymentUrl;
}