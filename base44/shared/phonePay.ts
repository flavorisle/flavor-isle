import { secrets } from 'base44:runtime';

// Shared helpers for the phone / text / website-chat order payment flow — the
// Flavor Isle /pay page behind the short link Smashie texts the customer.
//
// The money rules live here so the page's read endpoint and the tip endpoint
// price identically: every charge is rebuilt from the STORED order (subtotal +
// tax + delivery fee + tip) and never from the browser.

// An intent can only be re-priced while it is still unpaid.
export const TIP_EDITABLE_INTENT_STATUSES = ['requires_payment_method', 'requires_confirmation', 'requires_action'];

// The publishable key is safe for the browser. Read it the same way
// createPaymentIntent/getStripePublishableKey do — runtime secret first, then
// the environment variable — so a key set in one place can't strand /pay.
export function resolvePublishableKey() {
  let publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');
  try {
    publishableKey = secrets.get('STRIPE_PUBLISHABLE_KEY') || publishableKey;
  } catch (keyErr) {
    console.error('Publishable key unavailable via runtime secrets:', keyErr.message);
  }
  return publishableKey || null;
}

// Re-price an order with a tip: subtotal + tax + delivery fee + tip, rounded to
// cents. A tip may not exceed the food subtotal (tiny orders may tip up to
// $10), which stops a forged or fat-fingered value from inflating the charge.
export function verifyPhoneOrderTip(order, rawTip) {
  const subtotal = Number(order?.subtotal) || 0;
  const tax = Number(order?.tax) || 0;
  const deliveryFee = Number(order?.delivery_fee) || 0;
  const tip = Math.round((Number(rawTip) || 0) * 100) / 100;

  if (!Number.isFinite(tip) || tip < 0) {
    return { ok: false, error: 'That tip amount is not valid.' };
  }
  const cap = Math.max(subtotal, 10);
  if (tip > cap) {
    return { ok: false, error: `A tip on this order can be at most $${cap.toFixed(2)}.` };
  }

  const base = Math.round((subtotal + tax + deliveryFee) * 100) / 100;
  return { ok: true, tip, base, total: Math.round((base + tip) * 100) / 100 };
}

// The /pay link carries the six-digit order number (or a legacy PH number).
// A numeric order number can also belong to an online checkout, so never
// expose an unrelated order's payment details through the phone-pay page.
export async function findOrderByNumber(base44, orderNumber) {
  const wanted = String(orderNumber || '').trim().toUpperCase();
  if (!wanted) return null;
  const orders = await base44.asServiceRole.entities.Order.filter({ order_number: wanted });
  const payableOrders = (orders || []).filter(order => order.payment_url || order.manual_pay_required);
  return payableOrders.length === 1 ? payableOrders[0] : null;
}

// What the customer sees on their own payment page. Deliberately narrow: first
// name only, no address and no phone number — the link only proves they hold
// the text, so nothing sensitive rides on it.
export function orderPaySummary(order) {
  return {
    order_number: order.order_number,
    first_name: String(order.customer_name || '').trim().split(/\s+/)[0] || 'there',
    order_type: order.order_type || 'pickup',
    items: (order.items || []).map((item) => ({
      name: item.name,
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
      modifiers: (item.selectedModifiers || []).map((m) => m.name).filter(Boolean),
    })),
    subtotal: Number(order.subtotal) || 0,
    tax: Number(order.tax) || 0,
    delivery_fee: Number(order.delivery_fee) || 0,
    tip: Number(order.tip) || 0,
    total: Number(order.total) || 0,
    payment_status: order.payment_status || 'pending',
  };
}