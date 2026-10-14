import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { orderPaySummary } from '../../shared/phonePay.ts';

// What our own payment page shows for one order — an online food order, a phone
// order, or Tasty Threads merch.
//
// Public on purpose (the customer arrives from a text link or a redirect), and
// deliberately narrow: first name, the items, the money. Holding an order number
// never proves payment and never moves money — the charge itself is made
// server-side from the stored order.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const orderNumber = String(body?.order_number || '').trim().toUpperCase();
    if (!orderNumber) return Response.json({ error: 'order_number is required' }, { status: 400 });

    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber });
    const order = (orders || [])[0];

    if (order) {
      const summary = { ...orderPaySummary(order), kind: 'food' };
      if (order.payment_status === 'paid') {
        return Response.json({ ...summary, paid: true, payable: false });
      }
      if (order.status === 'cancelled' || order.payment_status === 'refunded') {
        return Response.json({ ...summary, paid: false, payable: false, reason: 'payment_closed' });
      }
      if (order.pay_cash_on_pickup) {
        return Response.json({ ...summary, paid: false, payable: false, reason: 'pay_at_counter' });
      }
      // This page is where the card is taken, so a card order — a website checkout
      // order, a phone order, an order that was texted a link — is payable here.
      // The exception is an order that still pays on a page of its own: a card
      // intent from the retired Stripe path, the old Square page, or the Base44
      // Payments hosted checkout. Paying on that one and on this one would be two
      // charges for the same food.
      if (
        order.stripe_session_id ||
        order.square_payment_link_id ||
        order.wix_checkout_session_id ||
        (order.payment_provider && order.payment_provider !== 'helcim')
      ) {
        return Response.json({ ...summary, paid: false, payable: false, reason: 'own_card_form' });
      }
      // An order the crew collects in person (an in-store or historical order
      // that was never set up to pay online) has nothing to pay here.
      if (!order.payment_url && !order.manual_pay_required) {
        return Response.json({ ...summary, paid: false, payable: false, reason: 'pay_at_counter' });
      }
      return Response.json({ ...summary, paid: false, payable: true });
    }

    const merchOrders = await base44.asServiceRole.entities.MerchOrder.filter({ order_number: orderNumber });
    const merch = (merchOrders || [])[0];
    if (!merch) {
      return Response.json(
        { error: 'We could not find that order. Check the order number, or call us at (270) 563-4618.' },
        { status: 404 },
      );
    }

    const merchSummary = {
      kind: 'merch',
      order_number: merch.order_number,
      first_name: String(merch.customer_name || '').trim().split(/\s+/)[0] || 'there',
      order_type: 'merch',
      items: (merch.items || []).map((item) => ({
        name: item.name,
        quantity: Number(item.quantity) || 1,
        price: Number(item.price) || 0,
        modifiers: item.variantName ? [item.variantName] : [],
      })),
      subtotal: Number(merch.subtotal) || 0,
      tax: 0,
      delivery_fee: Number(merch.shipping) || 0,
      tip: 0,
      total: Number(merch.total) || 0,
      payment_status: merch.payment_status || 'pending',
    };

    if (merch.payment_status === 'paid') {
      return Response.json({ ...merchSummary, paid: true, payable: false });
    }
    if (merch.payment_status === 'failed' || merch.fulfillment_status === 'canceled') {
      return Response.json({ ...merchSummary, paid: false, payable: false, reason: 'payment_closed' });
    }
    // A card merch order pays on this page, for its own saved total. One still
    // pointing at an older payment page of its own pays there instead.
    if (merch.payment_provider && merch.payment_provider !== 'helcim') {
      return Response.json({ ...merchSummary, paid: false, payable: false, reason: 'payment_closed' });
    }
    return Response.json({ ...merchSummary, paid: false, payable: true });
  } catch (error) {
    console.error('getPayableOrder error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}