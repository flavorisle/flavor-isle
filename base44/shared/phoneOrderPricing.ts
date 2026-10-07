import { fromCents, salesTaxCents, toCents } from './taxMath.ts';

// Money rules for phone / text / website-chat orders, kept free of runtime
// imports so the logPhoneOrder totals, the PaymentIntent amount, and the
// settlement checks all derive from one place.

export const PHONE_ORDER_SOURCE = 'online';

export function phonePayUrl(orderNumber: string): string {
  return `https://flavor-isle.com/pay/${orderNumber}`;
}

// Phone orders are the only orders that carry a payment provider, a pay link,
// or the manual-pay flag.
export function isPhoneOrder(order: any): boolean {
  return !!(order?.payment_provider || order?.payment_url || order?.manual_pay_required);
}

// Subtotal + 6% tax (on food only) + delivery fee, in whole cents.
export function phoneOrderTotals(subtotal: number, deliveryFee = 0) {
  const subtotalCents = toCents(subtotal);
  const taxCents = salesTaxCents(subtotalCents);
  const feeCents = toCents(deliveryFee);
  return {
    subtotal: fromCents(subtotalCents),
    tax: fromCents(taxCents),
    deliveryFee: fromCents(feeCents),
    total: fromCents(subtotalCents + taxCents + feeCents),
  };
}

// What the stored order says should be charged, tip included.
export function expectedPhoneOrderCents(order: any): number {
  return toCents(order?.subtotal) + toCents(order?.tax) + toCents(order?.delivery_fee) + toCents(order?.tip);
}

// Settlement guard: the money Stripe actually took must be a succeeded USD
// payment for exactly the stored order total (which already includes any tip).
export function phoneIntentMatchesOrder(order: any, intent: any): boolean {
  if (intent?.status !== 'succeeded') return false;
  if (String(intent.currency || '').toLowerCase() !== 'usd') return false;
  const received = Number(intent.amount_received ?? intent.amount);
  return received === toCents(order?.total) && received === expectedPhoneOrderCents(order);
}
