import { createSquareCheckoutLink } from './squareWebCheckout.ts';

// The automatic Square fallback (issue #116, Part C).
//
// When the primary card page cannot be opened for a saved order — the platform
// checkout refused, the account is not boarded yet, the session call failed — the
// SAME saved order is handed a Square checkout link instead. The customer is never
// left on a dead button, and no second order is created: the money, the items and the
// order number all stay the ones already on the record.
//
// Square recomputes the total from the line items, discounts, tax and fees below and
// the link is deleted unless its own total equals the order's saved total, so a
// mismatch can never be charged.
export async function openSquareFallbackForOrder(base44: any, order: any, appUrl: string) {
  const totalCents = Math.round(Number(order.total) * 100);
  const tipCents = Math.round((Number(order.tip) || 0) * 100);
  const deliveryCents = Math.round((Number(order.delivery_fee) || 0) * 100);
  const discountCents = Math.round(
    ((Number(order.discount) || 0) + (Number(order.happy_hour_discount) || 0) + (Number(order.bundle_discount) || 0)) * 100,
  );

  const serviceCharges = [
    ...(deliveryCents > 0 ? [{ uid: 'delivery', name: 'Delivery', amountUsd: deliveryCents / 100 }] : []),
    ...(tipCents > 0 ? [{ uid: 'tip', name: 'Tip', amountUsd: tipCents / 100 }] : []),
  ];

  const link = await createSquareCheckoutLink(base44, {
    // Stable per order: a retry of the same fallback reuses Square's own link
    // instead of minting a second payable page.
    idempotencyKey: `fallback-${order.id}`,
    referenceId: order.order_number,
    sourceName: 'Flavor Isle',
    lineItems: (order.items || []).map((item: any) => ({
      name: item.name,
      quantity: Number(item.quantity) || 1,
      unitPriceUsd: Number(item.price) || 0,
      ...(item.selectedModifiers?.length
        ? { note: item.selectedModifiers.map((mod: any) => mod.name).filter(Boolean).join(', ').slice(0, 255) }
        : {}),
    })),
    discounts: discountCents > 0
      ? [{ uid: 'order-discount', name: 'Discount', amountUsd: discountCents / 100 }]
      : [],
    taxUsd: Number(order.tax) || 0,
    taxBaseUsd: Number(order.subtotal) || 0,
    serviceCharges,
    totalCents,
    redirectUrl: `${appUrl}/order-confirmation?order_number=${encodeURIComponent(order.order_number)}&from=checkout`,
    fulfillmentNote: order.special_instructions || '',
    // The tip is already inside the saved total, so it is never asked for twice.
    allowTipping: false,
  });

  await base44.asServiceRole.entities.Order.update(order.id, {
    payment_provider: 'square',
    payment_url: link.url,
    square_payment_link_id: link.linkId,
    square_checkout_order_id: link.orderId,
    manual_pay_required: false,
    payment_fallback_note:
      'The primary card page could not be opened, so this order was sent to the Square payment page automatically.',
  });

  return link;
}