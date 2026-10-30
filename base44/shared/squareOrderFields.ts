// Maps a Square order (read-only) onto the Order fields both the POS sync and
// the one-time backfill write. Nothing here is estimated: a value Square does
// not carry comes back empty ('' / 0) and the caller leaves the stored value
// alone.
import { normalizePhone } from './squareCustomer.ts';

const cents = (money) => (money?.amount != null ? Number(money.amount) / 100 : 0);

export function squareOrderType(fulfillment) {
  const type = fulfillment?.type;
  if (type === 'PICKUP') return 'pickup';
  if (type === 'DELIVERY') return 'delivery';
  return 'dine_in';
}

export function squareOrderFields(so, customer) {
  const fulfillment = (so?.fulfillments || [])[0] || null;
  const tenders = Array.isArray(so?.tenders) ? so.tenders : [];

  // The ticket's own customer, else the paying card's customer from its tender.
  const customerId = so?.customer_id
    || tenders.map((t) => t.customer_id).find(Boolean)
    || '';

  const lineGrossCents = (so?.line_items || []).reduce(
    (sum, li) => sum + (Number(li?.gross_sales_money?.amount) || 0),
    0,
  );

  // A tender that carries card or cash details is money actually taken.
  const settled = tenders.some((t) => t.card_details || t.cash_details);

  const phone = customer?.phone || '';

  const fields: Record<string, any> = {
    customer_id: customerId,
    normalized_phone: normalizePhone(phone),
    tip: cents(so?.total_tip_money),
    discount: cents(so?.total_discount_money),
    subtotal: so?.net_amounts?.total_money?.amount != null
      ? cents(so.net_amounts.total_money)
      : lineGrossCents / 100,
    total: cents(so?.total_money),
    tax: cents(so?.total_tax_money),
    payment_provider: 'square',
    square_payment_link_id: tenders.map((t) => t.payment_id).find(Boolean) || '',
    order_type: squareOrderType(fulfillment),
    special_instructions:
      fulfillment?.pickup_details?.note
      || fulfillment?.delivery_details?.note
      || '',
    // 'pending' is the entity's own word for not-yet-paid; the value only
    // becomes 'paid' when Square shows a real card or cash tender.
    payment_status: settled ? 'paid' : 'pending',
    // Customer details from Square, for the caller to apply where empty.
    square_name: customer?.name || '',
    square_email: customer?.email || '',
    square_phone: phone,
  };

  const table = fulfillment?.dine_in_details?.table_name || '';
  if (table) fields.table_number = table;

  return fields;
}