import test from 'node:test';
import assert from 'node:assert/strict';
import { diffSettings, changeReach, renderValue, fieldLabel, FIELD_REACH } from './settingsChanges.ts';

// A save that changes nothing must report nothing, even though the admin forms
// rewrite every field (and the record's own updated_date) on each save.
test('an unchanged save reports no changes', () => {
  const before = { ordering_enabled: true, delivery_fee: 0, business_hours: { monday: { open: '10:00', close: '20:00' } }, updated_date: '2026-10-01T00:00:00Z' };
  const after = { ...before, updated_date: '2026-10-09T00:00:00Z' };
  assert.deepEqual(diffSettings(before, after), []);
});

test('the Meta token and record bookkeeping are never reported', () => {
  const before = { facebook_access_token: 'OLD', id: 'a', created_date: 'x', description: 'y' };
  const after = { facebook_access_token: 'NEW', id: 'a', created_date: 'x', description: 'z' };
  assert.deepEqual(diffSettings(before, after), []);
});

test('a switch that flipped is reported with its before and after and what it drives', () => {
  const [change] = diffSettings({ ordering_enabled: true }, { ordering_enabled: false });
  assert.equal(change.field, 'ordering_enabled');
  assert.equal(change.old, 'ON');
  assert.equal(change.new, 'OFF');
  assert.match(change.reach, /^Both/);
  assert.equal(FIELD_REACH.ordering_enabled, change.reach);
});

test('a nested settings object is compared structurally, not by reference', () => {
  const before = { site_notice: { active: false, message: 'none' } };
  assert.deepEqual(diffSettings(before, { site_notice: { active: false, message: 'none' } }), []);
  const [change] = diffSettings(before, { site_notice: { active: true, message: 'delivery paused' } });
  assert.equal(change.field, 'site_notice');
  assert.match(change.new, /delivery paused/);
});

test('a field that appeared or was cleared is still reported', () => {
  const [added] = diffSettings({}, { early_close: { date: '2026-10-09', close_time: '17:00' } });
  assert.equal(added.field, 'early_close');
  assert.equal(added.old, '(empty)');
  const [cleared] = diffSettings({ early_close: { date: '2026-10-09' } }, { early_close: null });
  assert.equal(cleared.new, '(empty)');
});

test('a change notices which systems it reaches', () => {
  assert.equal(changeReach(diffSettings({ ordering_enabled: true }, { ordering_enabled: false })), 'both');
  assert.equal(changeReach(diffSettings({ phone_cash_enabled: true }, { phone_cash_enabled: false })), 'phone');
  assert.equal(changeReach(diffSettings({ modifier_overrides: {} }, { modifier_overrides: { a: 1 } })), 'website');
  // A mix reports both, because the change does touch the website.
  assert.equal(
    changeReach(diffSettings({ phone_cash_enabled: true, delivery_fee: 0 }, { phone_cash_enabled: false, delivery_fee: 2 })),
    'both'
  );
});

test('values are rendered readably and long ones are trimmed', () => {
  assert.equal(renderValue(undefined), '(empty)');
  assert.equal(renderValue(''), '(empty)');
  assert.equal(renderValue(true), 'ON');
  assert.equal(renderValue(6), '6');
  const long = 'x'.repeat(400);
  assert.equal(renderValue(long).length, 303); // 300 chars plus '...'
  assert.match(renderValue({ a: 1 }), /^\{/);
  assert.equal(fieldLabel('phone_cash_enabled'), 'phone cash enabled');
});