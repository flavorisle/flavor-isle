import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PHONE_ORDER_SOURCE,
  expectedPhoneOrderCents,
  isPhoneOrder,
  phoneIntentMatchesOrder,
  phoneOrderTotals,
  phonePayUrl,
} from './phoneOrderPricing.ts';

test('phone pay links point at the site-hosted pay page, not a processor', () => {
  assert.equal(phonePayUrl('123456'), 'https://flavor-isle.com/pay/123456');
});

test('phone orders are tagged with an existing order_source value', () => {
  assert.equal(PHONE_ORDER_SOURCE, 'online');
});

test('pickup totals are subtotal plus 6% tax', () => {
  assert.deepEqual(phoneOrderTotals(10), { subtotal: 10, tax: 0.6, deliveryFee: 0, total: 10.6 });
});

test('delivery fee is added to the total and is not taxed', () => {
  assert.deepEqual(phoneOrderTotals(10, 3.5), { subtotal: 10, tax: 0.6, deliveryFee: 3.5, total: 14.1 });
});

test('tax rounds half up on odd-cent subtotals', () => {
  assert.equal(phoneOrderTotals(3.25).tax, 0.2);
});

test('only orders with phone-payment fields count as phone orders', () => {
  assert.equal(isPhoneOrder({ payment_provider: 'stripe' }), true);
  assert.equal(isPhoneOrder({ manual_pay_required: true }), true);
  assert.equal(isPhoneOrder({ payment_url: 'https://flavor-isle.com/pay/1' }), true);
  assert.equal(isPhoneOrder({ stripe_session_id: 'pi_1' }), false);
});

const order = { subtotal: 10, tax: 0.6, delivery_fee: 3.5, tip: 2, total: 16.1 };

test('expected charge includes delivery fee and tip', () => {
  assert.equal(expectedPhoneOrderCents(order), 1610);
});

test('settlement requires a succeeded USD payment for the exact total', () => {
  const intent = { status: 'succeeded', currency: 'usd', amount_received: 1610 };
  assert.equal(phoneIntentMatchesOrder(order, intent), true);
  assert.equal(phoneIntentMatchesOrder(order, { ...intent, status: 'processing' }), false);
  assert.equal(phoneIntentMatchesOrder(order, { ...intent, currency: 'eur' }), false);
  assert.equal(phoneIntentMatchesOrder(order, { ...intent, amount_received: 1600 }), false);
  assert.equal(phoneIntentMatchesOrder({ ...order, total: 15 }, intent), false);
});
