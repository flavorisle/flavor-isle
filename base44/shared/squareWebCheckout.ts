import { squarePhoneApi } from './squarePhoneApi.ts';

// Hosted Square checkout links for the website's secure payment page.
//
// Website orders pay on the processor's own hosted page and come straight back
// to flavor-isle.com, so the customer never sees a processor name anywhere in
// our UI — the same API path (squarePhoneApi → connect.squareup.com) the phone
// payment link already uses.
//
// Every link is verified BEFORE it is handed to a customer: Square recomputes
// the order from the line items, discounts, tax and fees we send, and if its own
// total does not equal the total we saved, the link is deleted rather than shown.
// That is what keeps a paid order and its record from ever disagreeing.
export async function createSquareCheckoutLink(base44: any, opts: {
  idempotencyKey: string;
  referenceId: string;
  sourceName: string;
  lineItems: Array<{ name: string; quantity: number; note?: string; unitPriceUsd: number }>;
  discounts?: Array<{ uid: string; name: string; amountUsd: number }>;
  taxUsd?: number;
  taxBaseUsd?: number;
  serviceCharges?: Array<{ uid: string; name: string; amountUsd: number }>;
  totalCents: number;
  redirectUrl: string;
  paymentNote?: string;
  fulfillmentNote?: string;
  recipient?: { display_name: string; phone_number?: string; email_address?: string };
  allowTipping?: boolean;
  metadata?: Record<string, string>;
}) {
  const api = await squarePhoneApi(base44);
  const locationId = await api.location();
  if (!locationId) throw new Error('Square location is unavailable.');

  const lineItems = (opts.lineItems || []).map((item) => ({
    name: item.name,
    quantity: String(item.quantity || 1),
    ...(item.note ? { note: item.note } : {}),
    base_price_money: { amount: Math.round((Number(item.unitPriceUsd) || 0) * 100), currency: 'USD' },
  }));
  if (lineItems.length === 0) throw new Error('A Square checkout link needs at least one line item.');

  // Discounts ride as order-level fixed amounts, tax as an ADDITIVE percentage
  // derived from the amount we owe — the identical shape createSquareOrder uses,
  // so Square's own math lands on the same total we stored.
  const discounts = (opts.discounts || [])
    .filter((d) => Math.round((Number(d.amountUsd) || 0) * 100) > 0)
    .map((d) => ({
      uid: d.uid,
      name: d.name,
      type: 'FIXED_AMOUNT',
      amount_money: { amount: Math.round(Number(d.amountUsd) * 100), currency: 'USD' },
      scope: 'ORDER',
    }));

  const taxes: any[] = [];
  const taxCents = Math.round((Number(opts.taxUsd) || 0) * 100);
  if (taxCents > 0 && Number(opts.taxBaseUsd) > 0) {
    taxes.push({
      uid: 'sales-tax',
      name: 'Sales Tax',
      type: 'ADDITIVE',
      percentage: ((Number(opts.taxUsd) / Number(opts.taxBaseUsd)) * 100).toFixed(2),
      scope: 'ORDER',
    });
  }

  const serviceCharges = (opts.serviceCharges || [])
    .filter((c) => Math.round((Number(c.amountUsd) || 0) * 100) > 0)
    .map((c) => ({
      uid: c.uid,
      name: c.name,
      amount_money: { amount: Math.round(Number(c.amountUsd) * 100), currency: 'USD' },
      calculation_phase: 'TOTAL_PHASE',
      taxable: false,
    }));

  const data = await api.request('online-checkout/payment-links', 'POST', {
    idempotency_key: opts.idempotencyKey,
    order: {
      location_id: locationId,
      reference_id: opts.referenceId,
      source: { name: opts.sourceName },
      line_items: lineItems,
      ...(discounts.length > 0 ? { discounts } : {}),
      ...(taxes.length > 0 ? { taxes } : {}),
      ...(serviceCharges.length > 0 ? { service_charges: serviceCharges } : {}),
      fulfillments: [{
        type: 'PICKUP',
        state: 'PROPOSED',
        pickup_details: {
          ...(opts.recipient ? { recipient: opts.recipient } : {}),
          schedule_type: 'ASAP',
          ...(opts.fulfillmentNote ? { note: opts.fulfillmentNote } : {}),
        },
      }],
      ...(opts.metadata ? { metadata: opts.metadata } : {}),
    },
    // Tip options on the secure page, exactly like the pay link Smashie texts.
    checkout_options: { allow_tipping: opts.allowTipping !== false, redirect_url: opts.redirectUrl },
    // No pre_populated_data.buyer_email here: Square refuses a request carrying
    // BOTH a fulfillment and a buyer_email (CONFLICTING_PARAMETERS), and every
    // link this app creates has a pickup fulfillment. The customer's email rides
    // on the fulfillment recipient below, which Square accepts.
    ...(opts.paymentNote ? { payment_note: opts.paymentNote } : {}),
  });

  const link = data.payment_link;
  if (!link?.url || !link.order_id) throw new Error('Square did not return a payment link.');

  const checkoutOrder = data.related_resources?.orders?.find((item: any) => item.id === link.order_id)
    || (await api.request(`orders/${link.order_id}`)).order;
  if (Number(checkoutOrder?.total_money?.amount) !== Number(opts.totalCents)) {
    // Delete the unusable link so it can never be paid at the wrong amount.
    await api.request(`online-checkout/payment-links/${link.id}`, 'DELETE');
    throw new Error('Square checkout total did not match the saved order.');
  }

  return { url: link.url, linkId: link.id, orderId: link.order_id };
}