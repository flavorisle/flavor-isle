// Where an order actually came from — one rule shared by every admin surface.
//
// The old per-page rules treated any order carrying payment fields as a phone
// order. Since the inline card checkout went live, WEB orders carry
// `payment_provider` and `payment_url` too, so web orders were showing as
// "Phone" in admin. Checked in this order: the POS flag, the web marker
// (BEFORE the payment fields), then the phone signals, then the legacy
// Square-link-era phone payment fields.
export function getOrderSource(order) {
  if (!order) return 'online';
  if (order.order_source === 'in_store') return 'pos';
  if (order.direct_web_rewards_v2 === true) return 'online'; // web marker, checked BEFORE payment fields
  if (order.source_call_sid || order.pay_cash_on_pickup || order.manual_pay_required === true || order.order_number?.startsWith('PH')) return 'phone';
  if (order.payment_provider || order.payment_url) return 'phone'; // legacy Square-link-era phone orders
  return 'online'; // old web orders carry none of these fields
}