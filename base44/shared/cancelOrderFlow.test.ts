import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cancellationEmailBody } from './cancelOrderFlow.ts';

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