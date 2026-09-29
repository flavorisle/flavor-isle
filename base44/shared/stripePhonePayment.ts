import Stripe from 'npm:stripe@14.25.0';

// Used only when staff explicitly choose the backup processor.
export async function createStripePhonePayment(base44, order) {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  let intent = order.stripe_session_id ? await stripe.paymentIntents.retrieve(order.stripe_session_id) : null;
  if (intent && ['succeeded', 'processing'].includes(intent.status)) throw new Error('Payment has already completed or is processing. Do not send another link.');
  if (!intent || intent.status === 'canceled') {
    intent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100), currency: 'usd', payment_method_types: ['card'],
      metadata: { base44_app_id: Deno.env.get('BASE44_APP_ID'), order_id: order.id, order_number: order.order_number, phone_order: 'true' },
      description: `Flavor Isle order #${order.order_number}`,
    }, { idempotencyKey: `phone-backup-${order.id}-${order.stripe_session_id || 'first'}` });
  }
  const paymentUrl = `https://flavor-isle.com/pay/${order.order_number}`;
  await base44.asServiceRole.entities.Order.update(order.id, {
    payment_provider: 'stripe', stripe_session_id: intent.id, payment_url: paymentUrl,
    manual_pay_required: false, square_payment_link_id: '', square_checkout_order_id: '',
  });
  return paymentUrl;
}