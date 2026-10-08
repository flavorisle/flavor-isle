import test from 'node:test';
import assert from 'node:assert/strict';
import { mirrorPosRefunds, refundsByOrder, POS_CANCEL_REASON } from './posOrderCancellation.ts';

// Fake client: no customer phone, so the text path never runs and nothing here
// touches the network.
function fakeBase44(updates: any[]) {
  const emails: any[] = [];
  return {
    emails,
    client: {
      asServiceRole: {
        integrations: { Core: { SendEmail: async (msg: any) => { emails.push(msg); } } },
        entities: { Order: { update: async (id: string, data: any) => { updates.push({ id, data }); } } },
      },
    },
  };
}

const orderWith = (over: any = {}) => ({
  id: 'o1',
  order_number: '1001',
  status: 'confirmed',
  payment_status: 'paid',
  total: 25,
  customer_name: 'Alex',
  customer_email: 'guest@example.com',
  order_source: 'online',
  items: [],
  ...over,
});

const refundOf = (over: any = {}) => ({
  order_id: 'sq1',
  amount_money: { amount: 2500 },
  status: 'COMPLETED',
  reason: 'Canceled Order',
  ...over,
});

const indexOf = (order: any) => new Map([[order.square_order_id, order]]);

test('two refunds on one ticket add up, and carry the reason the crew typed', () => {
  const totals = refundsByOrder([
    refundOf({ amount_money: { amount: 1000 } }),
    refundOf({ amount_money: { amount: 500 }, reason: 'Out of buns' }),
  ]);
  assert.deepEqual(totals.get('sq1'), { cents: 1500, reason: 'Out of buns' });
});

test('a full register refund cancels an active order and tells the customer', async () => {
  const updates: any[] = [];
  const { client, emails } = fakeBase44(updates);
  const result = await mirrorPosRefunds(client, indexOf(orderWith({ square_order_id: 'sq1' })), [refundOf()]);

  assert.deepEqual(result, { recorded: 1, cancelled: 1, notified: 1 });
  assert.equal(updates[0].data.status, 'cancelled');
  assert.equal(updates[0].data.payment_status, 'refunded');
  assert.equal(updates[0].data.square_refund_amount, 25);
  // Square's own "Canceled Order" wording is not repeated to the customer.
  assert.equal(updates[0].data.cancel_reason, POS_CANCEL_REASON);
  assert.equal(emails.length, 1);
  assert.match(emails[0].subject, /cancelled — refund on the way/);
  // The notice itself is stamped on the order, so the crew can see it went out.
  assert.ok(updates[1].data.cancellation_email_sent_at);
});

test('a reason typed on the register is passed on to the customer', async () => {
  const updates: any[] = [];
  const { client } = fakeBase44(updates);
  await mirrorPosRefunds(client, indexOf(orderWith({ square_order_id: 'sq2' })), [refundOf({ order_id: 'sq2', reason: 'Out of buns' })]);
  assert.equal(updates[0].data.cancel_reason, 'Out of buns');
});

test('a partial refund is recorded without cancelling the order or emailing', async () => {
  const updates: any[] = [];
  const { client, emails } = fakeBase44(updates);
  const result = await mirrorPosRefunds(client, indexOf(orderWith({ square_order_id: 'sq3' })), [
    refundOf({ order_id: 'sq3', amount_money: { amount: 649 } }),
  ]);

  assert.deepEqual(result, { recorded: 1, cancelled: 0, notified: 0 });
  assert.deepEqual(updates[0].data, { square_refund_amount: 6.49 });
  assert.equal(emails.length, 0);
});

test('a refund after the fact marks the money refunded, not the order cancelled', async () => {
  const updates: any[] = [];
  const { client, emails } = fakeBase44(updates);
  await mirrorPosRefunds(client, indexOf(orderWith({ square_order_id: 'sq4', status: 'completed' })), [refundOf({ order_id: 'sq4' })]);

  assert.deepEqual(updates[0].data, { square_refund_amount: 25, payment_status: 'refunded' });
  assert.equal(emails.length, 0);
});

test('a cancelled walk-in ticket is mirrored without emailing the placeholder address', async () => {
  const updates: any[] = [];
  const { client, emails } = fakeBase44(updates);
  const order = orderWith({
    square_order_id: 'sq5',
    order_source: 'in_store',
    customer_email: 'square-pos@flavorisle.com',
  });
  const result = await mirrorPosRefunds(client, indexOf(order), [refundOf({ order_id: 'sq5' })]);

  assert.equal(result.cancelled, 1);
  assert.equal(result.notified, 0);
  assert.equal(emails.length, 0);
  assert.equal(updates[0].data.status, 'cancelled');
});

test('a refund already recorded on the order is not written again', async () => {
  const updates: any[] = [];
  const { client } = fakeBase44(updates);
  const order = orderWith({ square_order_id: 'sq6', status: 'cancelled', square_refund_amount: 25 });
  const result = await mirrorPosRefunds(client, indexOf(order), [refundOf({ order_id: 'sq6' })]);

  assert.deepEqual(result, { recorded: 0, cancelled: 0, notified: 0 });
  assert.equal(updates.length, 0);
});

test('a refund for an order this app never saw is ignored', async () => {
  const updates: any[] = [];
  const { client } = fakeBase44(updates);
  const result = await mirrorPosRefunds(client, new Map(), [refundOf({ order_id: 'unknown' })]);
  assert.deepEqual(result, { recorded: 0, cancelled: 0, notified: 0 });
  assert.equal(updates.length, 0);
});