import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCallContext, deliveryLine, CASH_OFF_PHONE_INTRO, OPEN_PHONE_INTRO } from './smashieLivePrompt.ts';

// What Smashie is told on a call. These are the lines that carry the store's
// switches onto the phone, so each one has to say exactly one thing.

const STATE = {
  orderingEnabled: true,
  orderingClosedMessage: 'Ordering is temporarily closed',
  deliveryEnabled: true,
  deliveryTiers: [{ max_miles: 3, fee: 0.99 }, { max_miles: 5, fee: 1.99 }],
  maxMiles: 5,
  flatDeliveryFee: 4.5,
  activeNotice: { active: false, message: '', level: 'warning' },
};

test('the delivery line quotes the range and fees up front', () => {
  const line = deliveryLine(STATE);
  assert.match(line, /DELIVERY: AVAILABLE/);
  assert.match(line, /within 5 miles/);
  assert.match(line, /up to 3 mi \$0\.99/);
  assert.match(line, /up to 5 mi \$1\.99/);
});

test('the delivery line falls back to the flat fee when no tiers are set', () => {
  assert.match(deliveryLine({ ...STATE, deliveryTiers: [], maxMiles: null }), /flat \$4\.50/);
  assert.match(deliveryLine({ ...STATE, deliveryTiers: [], maxMiles: null }), /no set mileage limit/);
});

test('paused delivery is stated as paused, not as a fee', () => {
  const line = deliveryLine({ ...STATE, deliveryEnabled: false });
  assert.match(line, /DELIVERY: PAUSED/);
  assert.doesNotMatch(line, /up to 3 mi/);
});

test('the cash switch reaches the phone context in both positions', () => {
  const on = buildCallContext({ storeStatus: { open: true, message: '' }, storeState: STATE, cashEnabled: true, callerPhone: '+12705550000' });
  assert.match(on, /\[CASH: accepted for pickup orders\]/);

  const off = buildCallContext({ storeStatus: { open: true, message: '' }, storeState: STATE, cashEnabled: false, callerPhone: '+12705550000' });
  assert.match(off, /\[CASH: not accepted/);
  assert.match(off, /politely decline cash/);
});

test('an early close is stated in the store status line', () => {
  const context = buildCallContext({
    storeStatus: { open: true, message: 'we close at 5:00 PM today. No orders after 5:00 PM.' },
    storeState: STATE,
    cashEnabled: true,
    callerPhone: '+12705550000',
  });
  assert.match(context, /STORE STATUS: OPEN — we close at 5:00 PM today/);
});

test('a live notice is handed to Smashie in the site\u2019s own words', () => {
  const context = buildCallContext({
    storeStatus: { open: true, message: '' },
    storeState: { ...STATE, activeNotice: { active: true, message: 'Delivery is paused today', level: 'urgent' } },
    cashEnabled: true,
    callerPhone: '+12705550000',
  });
  assert.match(context, /\[NOTICE: "Delivery is paused today" \(urgent\)/);
});

test('no notice means no notice line', () => {
  const context = buildCallContext({ storeStatus: { open: true, message: '' }, storeState: STATE, cashEnabled: true, callerPhone: '+12705550000' });
  assert.doesNotMatch(context, /NOTICE:/);
});

test('the caller phone is handed over for the order, never asked for', () => {
  const context = buildCallContext({ storeStatus: { open: true, message: '' }, storeState: STATE, cashEnabled: true, callerPhone: '+12705550000' });
  assert.match(context, /Always pass this exact number to place_order as customer_phone/);
});

test('the cash-off opening says card only, with no cash offer', () => {
  assert.match(CASH_OFF_PHONE_INTRO, /secure card payment link/);
  assert.doesNotMatch(CASH_OFF_PHONE_INTRO, /cash/i);
  assert.match(OPEN_PHONE_INTRO, /cash due when you pick it up/);
});