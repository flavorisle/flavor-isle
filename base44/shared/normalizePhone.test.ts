import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, phoneDigits } from './normalizePhone.ts';

// Issue #96, section A step 1 — the exact rule the Order backfill and every
// order-creation path relies on.
test('normalizePhone puts 10 digits into +1 form', () => {
  assert.equal(normalizePhone('2705634618'), '+12705634618');
  assert.equal(normalizePhone('(270) 563-4618'), '+12705634618');
  assert.equal(normalizePhone('270-563-4618'), '+12705634618');
  assert.equal(normalizePhone('270.563.4618'), '+12705634618');
});

test('normalizePhone puts 11 digits starting with 1 into +1 form', () => {
  assert.equal(normalizePhone('12705634618'), '+12705634618');
  assert.equal(normalizePhone('+1 270 563 4618'), '+12705634618');
  assert.equal(normalizePhone('1 (270) 563-4618'), '+12705634618');
});

test('normalizePhone returns anything else unchanged', () => {
  assert.equal(normalizePhone('+442071234567'), '+442071234567');
  assert.equal(normalizePhone('555'), '555');
  assert.equal(normalizePhone('call the store'), 'call the store');
  assert.equal(normalizePhone('22705634618'), '22705634618');
});

test('normalizePhone never returns null', () => {
  assert.equal(normalizePhone(null), '');
  assert.equal(normalizePhone(undefined), '');
  assert.equal(normalizePhone(''), '');
});

test('phoneDigits returns the matchable last ten digits', () => {
  assert.equal(phoneDigits('(270) 563-4618'), '2705634618');
  assert.equal(phoneDigits('+1 270 563 4618'), '2705634618');
  assert.equal(phoneDigits('555'), '');
  assert.equal(phoneDigits(null), '');
});