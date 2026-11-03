import test from 'node:test';
import assert from 'node:assert/strict';
import { squareBuildCardSource } from './squareBuildCardSource.ts';

const categories = [{ id: 'bliss', category_data: { name: 'BLEND & BLISS' } }];
const modifier = (id, name, extra = {}) => ({ id, modifier_data: { name, ...extra } });
const list = (id, name, options, extra = {}) => ({ id, modifier_list_data: { name, modifiers: options }, ...extra });
const item = attachments => ({ id: 'shake', item_data: {
  name: 'Exact Bliss', categories: [{ id: 'bliss' }],
  variations: [{ id: 'large', item_variation_data: { name: '20oz', price_money: { amount: 649, currency: 'USD' } } }],
  modifier_list_info: attachments,
} });

test('prints every option of an active group, including duplicate wording, paid and unnamed ones', () => {
  const source = squareBuildCardSource(categories, [item([{ modifier_list_id: 'a' }])], [
    list('a', 'Banana Split Bliss Ingredients', [
      modifier('one', 'Optional: EXACT lowerCASE', { price_money: { amount: 50, currency: 'USD' } }),
      modifier('two', 'Optional: EXACT lowerCASE', { hidden_online: true }), modifier('empty', ''),
    ]),
  ]);
  assert.equal(source[0].modifiers.length, 1);
  assert.deepEqual(source[0].modifiers[0].modifiers.map(value => value.name),
    ['Optional: EXACT lowerCASE', 'Optional: EXACT lowerCASE', '']);
  assert.equal(source[0].modifiers[0].modifiers[0].price_money.amount, 50);
  assert.equal(source[0].variations[0].price_money.amount, 649);
});

test('drops groups the crew disabled on the item and lists deleted in Square', () => {
  const source = squareBuildCardSource(categories, [item([
    { modifier_list_id: 'on' }, { modifier_list_id: 'off', enabled: false }, { modifier_list_id: 'gone' },
  ])], [list('on', 'Keep', [modifier('kept', 'Kept')]), list('off', 'Disabled', [modifier('skip', 'Skip')])]);
  assert.deepEqual(source[0].modifiers.map(group => group.name), ['Keep']);
});

test('resolves nested options and follows the global default when the item says NOT_SET', () => {
  const source = squareBuildCardSource(categories, [item([{ modifier_list_id: 'a', modifier_overrides: [
    { modifier_id: 'parent', on_by_default_override: 'NOT_SET' },
    { modifier_id: 'other', on_by_default_override: 'NO' },
  ] }])], [list('a', 'Parent', [
    modifier('parent', 'Parent option', { on_by_default: true, child_modifier_list_ids: ['child'] }),
    modifier('other', 'Other option', { on_by_default: true }),
  ]), list('child', 'Follow-up', [modifier('nested', 'Nested option')])]);
  const [parent, other] = source[0].modifiers[0].modifiers;
  assert.equal(parent.on_by_default, true);
  assert.equal(other.on_by_default, false);
  assert.equal(parent.child_modifier_lists[0].modifiers[0].id, 'nested');
});