import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cancellationEmailBody, notifyOrderCancelled } from './cancelOrderFlow.ts';

const orderWith = (over: Record<string, unknown> = {}) => ({
  order_number: '850893',
  customer_name: 'Benny',
  items: [{ name: '3 pc Chicken Strips', price: 8.69, quantity: 2 }],
  total: 17.38,
  ...over,
});

test('quotes the reason the crew typed', () => {
  const html = cancellationEmailBody(
    orderWith({ cancel_reason: 'we ran out of chicken strips' }),
    { refunded: true, amountText: '$17.38' },
  );
  assert.match(html, /What happened: we ran out of chicken strips/);
  assert.match(html, /refunded <strong style="color:#C0392B;">\$17\.38<\/strong>/);
});

test('leaves the line out when no reason was typed', () => {
  const html = cancellationEmailBody(orderWith(), { refunded: true, amountText: '$17.38' });
  assert.doesNotMatch(html, /What happened/);
});

test('escapes markup typed into the reason', () => {
  const html = cancellationEmailBody(
    orderWith({ cancel_reason: 'out of <b>strips</b> & buns' }),
    { refunded: false, amountText: '$0.00' },
  );
  assert.match(html, /What happened: out of &lt;b&gt;strips&lt;\/b&gt; &amp; buns/);
});

// Fake client: no phone on the order, so only the email path runs and nothing
// touches the network.
const fakeClient = ({ updates, sendEmail }: { updates: any[]; sendEmail: () => Promise<unknown> }) => ({
  asServiceRole: {
    integrations: { Core: { SendEmail: sendEmail } },
    entities: { Order: { update: async (id: string, data: unknown) => { updates.push({ id, data }); } } },
  },
});

test('records the cancellation email on the order when it goes out', async () => {
  const updates: any[] = [];
  const base44 = fakeClient({ updates, sendEmail: async () => ({ ok: true }) });
  const result = await notifyOrderCancelled(base44, orderWith({ id: 'o1', customer_email: 'b@example.com' }), { refunded: true });

  assert.equal(result.email, 'sent');
  assert.equal(result.sms, null);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].id, 'o1');
  assert.ok(updates[0].data.cancellation_email_sent_at, 'the sent stamp is written');
});

test('records nothing when the cancellation email is refused', async () => {
  const updates: any[] = [];
  const base44 = fakeClient({
    updates,
    sendEmail: async () => { throw new Error('recipient refused'); },
  });
  const result = await notifyOrderCancelled(base44, orderWith({ id: 'o2', customer_email: 'b@example.com' }), { refunded: true });

  assert.match(String(result.email), /^failed/);
  assert.equal(updates.length, 0, 'a refused send leaves no stamp');
});