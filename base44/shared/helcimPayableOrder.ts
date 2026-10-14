// The money rule every card form shares.
//
// One saved record is being paid: a food order (which may carry a tip the customer
// picked on our own page) or a Tasty Threads merch order (which never does). This
// module answers which it is, whether it may be paid at all, and the exact amount in
// cents — so the processor's own secure form and our own inline card fields can never
// disagree about what a customer is charged.
//
// Nothing here trusts the browser: the amount always comes from the STORED record.

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type PayableOrder = {
  kind: 'food' | 'merch';
  record: any;
  orderNumber: string;
  // What the card is charged: the saved total plus any tip picked just now.
  amountCents: number;
  // The tip picked on this attempt (0 when the order already carried it).
  tipCents: number;
  // Whether a tip was sent at all — a website checkout order sends none, because its
  // tip is already inside its saved total.
  tipProvided: boolean;
};

export type PayableResult = { payable: PayableOrder } | { error: string; status: number; paid?: boolean };

export async function resolvePayableOrder(
  base44: any,
  rawOrderNumber: unknown,
  pickedTip: unknown,
): Promise<PayableResult> {
  const orderNumber = String(rawOrderNumber || '').trim().toUpperCase();
  if (!orderNumber) return { error: 'order_number is required', status: 400 };

  // The order number is not unique on its own, so the newest card order with that
  // number is the one being paid.
  const orders = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber }, '-created_date', 10);
  const order = (orders || []).find((o: any) => o.payment_provider === 'helcim');
  if (!order) {
    // Tasty Threads merch lives in its own record with its own saved total, and a merch
    // order never carries a tip: the card is taken for exactly what was saved.
    const merchOrders = await base44.asServiceRole.entities.MerchOrder.filter({ order_number: orderNumber }, '-created_date', 10);
    const merch = (merchOrders || [])[0];
    if (!merch) return { error: 'That order does not pay through this page.', status: 404 };
    if (merch.payment_status === 'paid') return { error: 'This order is already paid.', status: 409, paid: true };
    if (merch.fulfillment_status === 'canceled' || merch.payment_status === 'refunded') {
      return { error: 'This order is no longer open.', status: 409 };
    }
    const merchTotal = round2(Number(merch.total) || 0);
    if (!(merchTotal > 0)) return { error: 'That order has no amount to pay.', status: 409 };
    return {
      payable: {
        kind: 'merch',
        record: merch,
        orderNumber: merch.order_number,
        amountCents: Math.round(merchTotal * 100),
        tipCents: 0,
        tipProvided: false,
      },
    };
  }

  if (order.payment_status === 'paid') return { error: 'This order is already paid.', status: 409, paid: true };
  if (order.status === 'cancelled' || order.payment_status === 'refunded') {
    return { error: 'This order is no longer open.', status: 409 };
  }
  if (order.pay_cash_on_pickup) return { error: 'This order is paid in cash at the counter.', status: 409 };

  // A tip picked on our page is added on top of the order's own total and is capped
  // the same way the phone flow caps it: at the food subtotal, or $10 on a tiny order.
  const tipProvided = pickedTip !== undefined && pickedTip !== null && pickedTip !== '';
  const baseCents = Math.round((Number(order.total) || 0) * 100);
  const tipCents = tipProvided ? Math.round((Number(pickedTip) || 0) * 100) : 0;
  const tipCapCents = Math.max(Math.round((Number(order.subtotal) || 0) * 100), 1000);
  if (tipCents < 0 || tipCents > tipCapCents) return { error: 'That tip amount is not valid.', status: 400 };

  return {
    payable: {
      kind: 'food',
      record: order,
      orderNumber: order.order_number,
      amountCents: baseCents + tipCents,
      tipCents,
      tipProvided,
    },
  };
}