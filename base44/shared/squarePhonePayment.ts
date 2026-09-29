import { squarePhoneApi } from './squarePhoneApi.ts';
import { formatItemModifiers } from './ticketFormat.ts';

export async function createSquarePhonePayment(base44, order) {
  const api = await squarePhoneApi(base44);
  const locationId = await api.location();
  if (!locationId) throw new Error('Square location is unavailable. Staff can send a Stripe backup.');
  const recipient = { display_name: `${order.customer_name} (#${order.order_number})`, phone_number: order.customer_phone };
  const email = order.customer_email && order.customer_email !== 'phone-order@flavorisle.com' ? order.customer_email : '';
  if (email) recipient.email_address = email;
  const data = await api.request('online-checkout/payment-links', 'POST', {
    idempotency_key: `phone-square-${order.id}`,
    order: {
      location_id: locationId, reference_id: order.id, source: { name: 'Flavor Isle Phone' },
      line_items: order.items.map(item => ({
        name: item.name, quantity: String(item.quantity || 1), note: formatItemModifiers(item).join(', '),
        base_price_money: { amount: Math.round(item.price * 100), currency: 'USD' },
      })),
      taxes: [{ uid: 'sales-tax', name: 'Sales Tax', percentage: '6', type: 'ADDITIVE', scope: 'ORDER' }],
      fulfillments: [{ type: 'PICKUP', state: 'PROPOSED', pickup_details: {
        recipient, schedule_type: 'ASAP',
        note: `${order.order_type.toUpperCase()}\n${order.delivery_address || ''}\n${order.special_instructions || ''}`.trim(),
      } }],
      metadata: { app_order_id: order.id, order_source: 'flavor-isle-phone', order_type: order.order_type },
    },
    checkout_options: { allow_tipping: true, redirect_url: `https://flavor-isle.com/pay/${order.order_number}` },
    ...(email ? { pre_populated_data: { buyer_email: email } } : {}),
    payment_note: `Flavor Isle phone order #${order.order_number}`,
  });
  const link = data.payment_link;
  if (!link?.url || !link.order_id) throw new Error('Square did not return a payment link.');
  const checkoutOrder = data.related_resources?.orders?.find(item => item.id === link.order_id) || (await api.request(`orders/${link.order_id}`)).order;
  if (Number(checkoutOrder.total_money?.amount) !== Math.round(order.total * 100)) {
    await api.request(`online-checkout/payment-links/${link.id}`, 'DELETE');
    throw new Error('Square checkout total did not match the saved order. Staff can send a Stripe backup.');
  }
  await base44.asServiceRole.entities.Order.update(order.id, {
    payment_provider: 'square', square_payment_link_id: link.id,
    square_checkout_order_id: link.order_id, payment_url: link.url, manual_pay_required: false,
  });
  return link.url;
}