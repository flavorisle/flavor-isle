import test from 'node:test';
import assert from 'node:assert/strict';
import { squareBuildCardSource } from './squareBuildCardSource.ts';

const categories = [{ id: 'bliss', category_data: { name: 'BLEND & BLISS' } }];
const modifier = (id, name, extra = {}) => ({ id, modifier_data: { name, ...extra } });
const list = (id, name, options) => ({ id, modifier_list_data: { name, modifiers: options } });
const item = attachments => ({ id: 'shake', item_data: {
  name: 'Exact Bliss', categories: [{ id: 'bliss' }],
  variations: [{ id: 'large', item_variation_data: { name: '20oz', price_money: { amount: 649, currency: 'USD' } } }],
  modifier_list_info: attachments,
} });

test('preserves every attached group, disabled/hidden lists, duplicate names, paid/free and unnamed options', () => {
  const source = squareBuildCardSource(categories, [item([
    { modifier_list_id: 'a', enabled: true }, { modifier_list_id: 'b', enabled: false },
  ])], [list('a', 'Not an ingredient or topping keyword', [
    modifier('one', 'Optional: EXACT lowerCASE', { price_money: { amount: 50, currency: 'USD' } }),
    modifier('two', 'Optional: EXACT lowerCASE', { hidden_online: true }), modifier('empty', ''),
  ]), list('b', 'DISABLED group', [modifier('three', 'Still attached')])]);
  assert.equal(source[0].modifiers.length, 2);
  assert.deepEqual(source[0].modifiers[0].modifiers.map(value => value.name), ['Optional: EXACT lowerCASE', 'Optional: EXACT lowerCASE', '']);
  assert.equal(source[0].modifiers[1].enabled, false);
  assert.equal(source[0].modifiers[1].modifiers[0].name, 'Still attached');
  assert.equal(source[0].modifiers[0].modifiers[0].price_money.amount, 50);
  assert.equal(source[0].variations[0].price_money.amount, 649);
});

test('resolves every nested option and respects per-item default overrides', () => {
  const source = squareBuildCardSource(categories, [item([{ modifier_list_id: 'a', modifier_overrides: [
    { modifier_id: 'parent', on_by_default_override: 'NO' },
  ] }])], [list('a', 'Parent', [modifier('parent', 'Parent option', { on_by_default: true, child_modifier_list_ids: ['child'] })]),
    list('child', 'Follow-up', [modifier('nested', 'Nested option')])]);
  assert.equal(source[0].modifiers[0].modifiers[0].on_by_default, false);
  assert.equal(source[0].modifiers[0].modifiers[0].child_modifier_lists[0].modifiers[0].id, 'nested');
});

test('NOT_SET follows the global default rather than the deprecated item flag', () => {
  const source = squareBuildCardSource(categories, [item([{ modifier_list_id: 'a', modifier_overrides: [
    { modifier_id: 'option', on_by_default: false, on_by_default_override: 'NOT_SET' },
  ] }])], [list('a', 'Defaults', [modifier('option', 'Default', { on_by_default: true })])]);
  assert.equal(source[0].modifiers[0].modifiers[0].on_by_default, true);
});

test('fails rather than silently returning incomplete cards when a referenced list is missing or cyclic', () => {
  assert.throws(() => squareBuildCardSource(categories, [item([{ modifier_list_id: 'missing' }])], []), /could not be loaded/);
  assert.throws(() => squareBuildCardSource(categories, [item([{ modifier_list_id: 'cycle' }])], [
    list('cycle', 'Cycle', [modifier('loop', 'Loop', { child_modifier_list_ids: ['cycle'] })]),
  ]), /cycle/);
});