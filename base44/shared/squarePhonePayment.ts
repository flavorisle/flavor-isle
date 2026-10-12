// The card payment page for a phone order.
//
// Nothing is created at Square here: the customer types their card on our own
// page (flavor-isle.com/pay/<order>), and the charge is made server-side against
// this order's stored total. The only thing this does is make sure the order is
// marked as paying online and carries the link the customer was texted.
export async function createSquarePhonePayment(base44, order) {
  const payUrl = `https://flavor-isle.com/pay/${order.order_number}`;
  await base44.asServiceRole.entities.Order.update(order.id, {
    payment_provider: 'square',
    payment_url: payUrl,
    manual_pay_required: false,
  });
  return payUrl;
}