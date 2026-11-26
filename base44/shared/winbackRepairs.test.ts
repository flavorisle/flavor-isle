import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { loadWinbackCustomers } from './winbackAudience.ts';
import { validatePromoCode, normalizePromoCode } from './promoCode.ts';
import { verifyOrderPricing } from './verifyOrderPricing.ts';
import { settleCashPickupPayment } from './settleCashPickupPayment.ts';

const now = new Date('2026-11-26T15:20:00Z');
const daysAgo = days => new Date(now.getTime() - days * 86400000).toISOString();
const codes = ['WEMISSYOU30', 'WEMISSYOU60', 'WEMISSYOU180'];
const promo = (code = codes[0], expires_at = '') => ({
  id: code, code, is_active: true, expires_at, percent_off: 10,
  min_subtotal: 10, per_customer_limit: 1,
});
const page = (items, next_cursor = null) => ({ items, has_more: !!next_cursor, next_cursor });

// Execute the actual checkout handler with isolated dependencies, without any
// payment, messaging, customer writes or other external services.
function checkoutHandler(name, client) {
  const source = readFileSync(new URL(`../functions/${name}/entry.ts`, import.meta.url), 'utf8');
  const js = stripTypeScriptTypes(source.replace(/^import .*;\r?\n/gm, ''), { mode: 'transform' });
  return vm.runInNewContext(`(() => { ${js.replace('export default async function', 'return async function')} })()`, {
    Response, console,
    createClientFromRequest: () => client,
    pickupTimeAllowed: async () => true,
    analyzeEmail: email => ({ normalized: email }),
    findBlock: async () => null,
    validateRewardDiscount: async () => ({ ok: true, exactDiscount: 9.5 }),
    validatePromoCode, normalizePromoCode, verifyOrderPricing,
    customerLinkFields: async () => ({ normalized_phone: '', customer_id: '' }),
    normalizeReferralCode: () => '',
    getSmashieSettings: async () => ({}), webPaymentProvider: () => 'wix',
    resolveAppUrl: () => 'https://flavor-isle.com', wixCheckoutConfigured: () => true,
    openWixCheckoutSession: async () => ({ checkoutSessionId: 'fake-session', redirectUrl: 'https://flavor-isle.com/order-confirmation' }),
  });
}

function checkoutClient(expires_at) {
  const saved = [];
  const entities = {
    PromoCode: { filter: async ({ code }) => [promo(code, expires_at)] },
    Order: {
      filter: async () => [],
      create: async data => { saved.push(data); return { id: 'new-order', ...data }; },
      update: async () => ({}),
    },
    MenuSetting: { get: async () => ({ id: 'settings', happy_hour: { active: false } }) },
    MenuItem: { list: async () => [{ name: 'Regression meal', price: 10, square_item_id: 'meal', is_available: true }] },
  };
  return { saved, client: { asServiceRole: { entities } } };
}

const checkoutBody = code => ({
  items: [{ name: 'Regression meal', price: 10, quantity: 1, square_item_id: 'meal' }],
  orderType: 'pickup', customer: { name: 'Guest', email: 'guest@example.net', phone: '' },
  subtotal: 10, deliveryFee: 0, tax: 0.6, total: 0.6, tip: 0,
  discount: 9.5, redemptionId: 'reward-tier', happyHourDiscount: 0, bundleDiscount: 0, promoCode: code,
});

for (const name of ['createSquareWebCheckout', 'createWixWebCheckout']) {
  test(`${name}: every unarmed code is refused before an order exists`, async () => {
    const { client, saved } = checkoutClient('');
    const handler = checkoutHandler(name, client);
    for (const code of codes) {
      const response = await handler(new Request('https://flavor-isle.com', {
        method: 'POST', body: JSON.stringify(checkoutBody(code)),
      }));
      assert.equal(response.status, 400);
      assert.equal((await response.json()).error, 'That promo code is not active yet.');
    }
    assert.equal(saved.length, 0);
  });

  test(`${name}: the saved promo is capped to the amount actually charged`, async () => {
    const { client, saved } = checkoutClient('2099-01-01T00:00:00Z');
    const response = await checkoutHandler(name, client)(new Request('https://flavor-isle.com', {
      method: 'POST', body: JSON.stringify(checkoutBody(codes[0])),
    }));
    assert.equal(response.status, 200, JSON.stringify(await response.json()));
    assert.equal(saved.length, 1);
    assert.equal(saved[0].promo_discount, 0.5); // original percentage discount was $1
    assert.equal(saved[0].discount, 9.5);
    assert.equal(saved[0].total, 0.6);
  });
}

test('expiry, $10 minimum and once-per-customer enforcement remain unchanged', async () => {
  const { client } = checkoutClient('2026-12-01T00:00:00Z');
  const check = options => validatePromoCode(client, { code: codes[0], subtotal: 10, email: 'guest@example.net', now, ...options });
  assert.equal((await check({})).ok, true);
  assert.equal((await check({ subtotal: 9.99 })).ok, false);
  assert.equal((await check({ now: new Date('2026-12-02') })).error, 'That promo code has expired.');
  client.asServiceRole.entities.Order.filter = async () => [{ id: 'paid-order', status: 'completed', payment_status: 'paid' }];
  assert.equal((await check({})).error, 'That promo code has already been used on this account.');
});

test('full history finds a 72-day-lapsed customer beyond 500 recent orders and the first profile page', async () => {
  const calls = [];
  const client = { asServiceRole: { entities: {
    CustomerProfile: { list: async options => options.cursor
      ? page([{ id: 'p72', name: 'Counter Guest', email: 'COUNTER@example.net', phone: '(270) 555-1234' }])
      : page([], 'profiles-next') },
    Order: { filter: async (query, options) => {
      calls.push(options);
      assert.equal(query.order_source, undefined);
      assert.equal(query.created_date, undefined);
      assert.deepEqual(query.payment_status, { $nin: ['failed', 'refunded'] });
      assert.deepEqual(query.$or, [{ payment_status: 'paid' }, { status: { $in: ['completed', 'delivered'] } }]);
      return options.cursor ? page([{
        id: 'old-counter', customer_email: 'square-pos@flavor-isle.com', customer_phone: '+12705551234',
        status: 'completed', payment_status: 'paid', order_source: 'in_store', created_date: daysAgo(72),
      }]) : page(Array.from({ length: 500 }, (_, i) => ({
        id: `recent-${i}`, customer_email: `recent-${i}@example.net`, created_date: daysAgo(1),
        status: 'completed', payment_status: 'paid', order_source: 'online',
      })), 'orders-next');
    } },
  } } };
  const audience = await loadWinbackCustomers(client);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].cursor, 'orders-next');
  const counter = audience.get('counter@example.net');
  assert.ok(counter);
  assert.equal(counter.order.customer_name, 'Counter Guest');
  assert.equal(counter.created.toISOString(), daysAgo(72));
  assert.equal(counter.order.customer_phone, '(270) 555-1234');
});

test('the latest purchase across channels wins, including a recent counter visit', async () => {
  const profile = { id: 'p1', name: 'Guest', email: 'guest@example.net', phone: '2705551234' };
  const audience = await loadWinbackCustomers({ asServiceRole: { entities: {
    CustomerProfile: { list: async () => page([profile]) },
    Order: { filter: async () => page([
      { id: 'online', customer_email: profile.email, created_date: daysAgo(72) },
      { id: 'counter', customer_email: 'square-pos@flavor-isle.com', normalized_phone: '+12705551234', created_date: daysAgo(2) },
    ]) },
  } } });
  assert.equal(audience.size, 1);
  assert.equal(audience.get(profile.email).order.id, 'counter');
  assert.equal(audience.get(profile.email).created.toISOString(), daysAgo(2));
});

for (const recordCash of [false, true]) {
  test(`cash settlement records one redemption only after verified payment (recordCash=${recordCash})`, async t => {
    const payment = { id: 'cash', status: 'COMPLETED', source_type: 'CASH', order_id: 'sq-order', total_money: { amount: 1500, currency: 'USD' } };
    t.mock.method(globalThis, 'fetch', async () => Response.json({ payment }));
    let order = { id: 'o1', order_number: '1001', promo_code: codes[0], pay_cash_on_pickup: true, total: 15, square_order_id: 'sq-order', status: 'confirmed', payment_status: 'pending' };
    const counts = [];
    const client = { asServiceRole: {
      connectors: { getConnection: async () => ({ accessToken: 'fake' }) },
      entities: {
        Order: {
          update: async (id, updates) => { order = { ...order, ...updates }; },
          filter: async () => [order],
        },
        PromoCode: {
          filter: async () => [promo()],
          update: async (id, updates) => { assert.equal(order.payment_status, 'paid'); counts.push(updates.times_redeemed); },
        },
      },
    } };
    const squareOrder = { location_id: 'location', tenders: recordCash ? [] : [{ payment_id: 'cash' }], net_amount_due_money: { amount: 1500 } };
    const paid = await settleCashPickupPayment(client, order, recordCash, squareOrder);
    assert.equal(paid.payment_status, 'paid');
    assert.deepEqual(counts, [1]);
    await settleCashPickupPayment(client, paid, recordCash, squareOrder);
    assert.deepEqual(counts, [1]);
  });
}

test('an unpaid cash order never records a redemption', async () => {
  const order = { pay_cash_on_pickup: true, payment_status: 'pending', square_order_id: 'sq', total: 15 };
  const client = { asServiceRole: {
    connectors: { getConnection: async () => ({ accessToken: 'fake' }) },
    entities: new Proxy({}, { get: () => { throw new Error('Unpaid order must not write a redemption'); } }),
  } };
  assert.equal(await settleCashPickupPayment(client, order, false, { tenders: [] }), order);
});