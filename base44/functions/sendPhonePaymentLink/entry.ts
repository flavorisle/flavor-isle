import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { squarePhoneApi } from '../../shared/squarePhoneApi.ts';
import { createSquarePhonePayment } from '../../shared/squarePhonePayment.ts';
import { settleSquarePhonePayment } from '../../shared/settleSquarePhonePayment.ts';
import { createStripePhonePayment } from '../../shared/stripePhonePayment.ts';
import { sendSmashieSms } from '../../shared/sendSmashieSms.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.error) return auth.error;
    const body = await req.json();
    if (!body.order_id) return Response.json({ error: 'Select a phone order.' }, { status: 400 });
    let order = await base44.asServiceRole.entities.Order.get(body.order_id);
    if (!order || !(order.payment_provider || order.payment_url || order.manual_pay_required)) return Response.json({ error: 'This is not a phone-payment order.' }, { status: 400 });
    if (order.pay_cash_on_pickup) return Response.json({ error: 'This order is cash at pickup. Collect and record cash instead of sending a card link.' }, { status: 409 });
    order = await settleSquarePhonePayment(base44, order);
    if (order.payment_status === 'paid' || order.status === 'cancelled' || order.payment_status === 'refunded') return Response.json({ error: 'This order cannot accept another payment.' }, { status: 409 });
    let paymentUrl = order.payment_url;
    if (body.use_stripe_backup === true) {
      if (order.payment_provider === 'square' && order.square_payment_link_id) {
        const api = await squarePhoneApi(base44);
        await api.request(`online-checkout/payment-links/${order.square_payment_link_id}`, 'DELETE');
        const { order: checkout } = await api.request(`orders/${order.square_checkout_order_id}`);
        if (checkout.state !== 'CANCELED') throw new Error('Square payment could not be safely closed. Do not send another payment link.');
        await base44.asServiceRole.entities.Order.update(order.id, { payment_url: '', square_payment_link_id: '', square_checkout_order_id: '', manual_pay_required: true });
      }
      paymentUrl = await createStripePhonePayment(base44, order);
    } else if (!paymentUrl && order.payment_provider === 'square') {
      paymentUrl = await createSquarePhonePayment(base44, order);
    }
    if (!paymentUrl) throw new Error('No payment link is available. Choose the Stripe backup.');
    const sent = await sendSmashieSms(order.customer_phone, `Flavor Isle: pay $${Number(order.total).toFixed(2)} for order #${order.order_number} here: ${paymentUrl}`);
    return Response.json({ payment_url: paymentUrl, sent, message: sent ? 'Payment link sent by text.' : 'The link is ready, but the text could not be sent. Open the order payment link and share it with the customer.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}