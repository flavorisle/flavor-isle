import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { squarePhoneApi } from '../../shared/squarePhoneApi.ts';
import { settleSquarePhonePayment } from '../../shared/settleSquarePhonePayment.ts';
import { settleHelcimPhonePayment } from '../../shared/helcimSettlement.ts';
import { createHelcimPhonePayment } from '../../shared/helcimPhonePayment.ts';
import { sendSmashieSms } from '../../shared/sendSmashieSms.ts';

// Resend a phone order's payment link by text.
//
// The link is always OUR OWN payment page on flavor-isle.com, with the card
// form on it — never a processor's hosted page. A resend reuses the URL already
// on the order, so it can never mint a second payable page for the same order.
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

    // A payment may have landed while nobody was looking — check the processor
    // before sending anything, so a paid order is never asked to pay again. Only a
    // legacy Square order is checked against Square; every other order pays by card.
    order = order.payment_provider === 'square'
      ? await settleSquarePhonePayment(base44, order)
      : await settleHelcimPhonePayment(base44, order);
    if (order.payment_status === 'paid' || order.status === 'cancelled' || order.payment_status === 'refunded') return Response.json({ error: 'This order cannot accept another payment.' }, { status: 409 });

    let paymentUrl = order.payment_url;
    // A leftover Square-hosted link from the earlier flow is closed first (only
    // once Square confirms it), so the customer can never pay it as well.
    if (order.payment_provider === 'square' && order.square_payment_link_id) {
      const api = await squarePhoneApi(base44);
      await api.request(`online-checkout/payment-links/${order.square_payment_link_id}`, 'DELETE');
      const { order: checkout } = await api.request(`orders/${order.square_checkout_order_id}`);
      if (checkout.state !== 'CANCELED') throw new Error('That older payment link could not be safely closed. Do not send another one.');
      await base44.asServiceRole.entities.Order.update(order.id, { payment_url: '', square_payment_link_id: '', square_checkout_order_id: '', manual_pay_required: true });
      paymentUrl = '';
    }

    // Every link minted from here on is a card link: an order still pointing at
    // the old Square page is moved onto it rather than sent there again.
    if (!paymentUrl || order.square_payment_link_id || order.payment_provider === 'square') {
      paymentUrl = await createHelcimPhonePayment(base44, order);
    }

    const sent = await sendSmashieSms(order.customer_phone, `Flavor Isle: pay $${Number(order.total).toFixed(2)} for order #${order.order_number} here: ${paymentUrl}`);
    return Response.json({ payment_url: paymentUrl, sent, message: sent ? 'Payment link sent by text.' : 'The link is ready, but the text could not be sent. Open the order payment link and share it with the customer.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}