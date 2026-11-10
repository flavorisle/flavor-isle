import test from 'node:test';
import assert from 'node:assert/strict';
import { mapSquareStatus, mapSquarePaymentStatus } from './squareOrderStatus.ts';

test('web and phone orders keep the pending path', () => {
  assert.equal(mapSquareStatus('OPEN'), 'pending');
  assert.equal(mapSquareStatus('DRAFT'), 'pending');
  assert.equal(mapSquareStatus('OPEN', { inStore: false }), 'pending');
});

test('register tickets land confirmed, never pending', () => {
  assert.equal(mapSquareStatus('OPEN', { inStore: true }), 'confirmed');
  assert.equal(mapSquareStatus('DRAFT', { inStore: true }), 'confirmed');
  assert.equal(mapSquareStatus('SOMETHING_NEW', { inStore: true }), 'confirmed');
});

test('closed and voided tickets are unchanged for both paths', () => {
  for (const inStore of [false, true]) {
    assert.equal(mapSquareStatus('COMPLETED', { inStore }), 'completed');
    assert.equal(mapSquareStatus('CANCELED', { inStore }), 'cancelled');
  }
});

test('payment status is untouched by the in-store flag', () => {
  assert.equal(mapSquarePaymentStatus('COMPLETED'), 'paid');
  assert.equal(mapSquarePaymentStatus('CANCELED'), 'failed');
  assert.equal(mapSquarePaymentStatus('OPEN'), 'pending');
});
