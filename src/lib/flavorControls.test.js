import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supportsLevels, modifierLevelOptions, nestedForLevel, withModifierLevel } from './modifierLevels.js';
import { findShakeFlavorOption } from './shakeFlavor.js';
import { restorePanelSelection } from './restorePanelSelection.js';

const amounts = {
  id: 'amount-list', name: '- / + Flavors', selection_type: 'SINGLE',
  modifiers: [
    { id: 'square-lite', name: 'Lite', price: 0 },
    { id: 'square-reg', name: 'Regular', price: 0 },
    { id: 'square-extra', name: 'Extra', price: 0.75 },
  ],
};
const flavor = (id, name) => ({ id, name, price: 0.75, child_modifier_lists: [amounts] });
const banana = flavor('banana', 'REAL FRUIT BANANA');
const pineapple = flavor('pineapple', 'CRUSHED PINEAPPLE');
const cookies = flavor('cookies', 'Cookies and Cream');
const item = (name, modifiers = [banana, pineapple, cookies]) => ({
  name, modifiers: [{ name: 'Add as many flavors as you like!', modifiers }],
});

test('Square-defined flavors retain all three amount controls and real prices', () => {
  assert.equal(supportsLevels(banana), true);
  assert.deepEqual(modifierLevelOptions(banana), ['lite', 'reg', 'extra']);
  assert.deepEqual(nestedForLevel(banana, 'extra'), {
    '- / + Flavors': { id: 'square-extra', name: 'Extra', price: 0.75 },
  });
});

test('options without Square amount lists never gain invented controls', () => {
  assert.equal(supportsLevels({ name: 'VANILLA ICE CREAM' }), false);
  assert.deepEqual(modifierLevelOptions({ name: 'CHERRY' }), []);
  assert.deepEqual(nestedForLevel({ name: 'CHERRY' }, 'extra'), {});
});

test('a real Square amount list wins over option-name exclusions', () => {
  assert.equal(supportsLevels(flavor('base', 'VANILLA ICE CREAM')), true);
  assert.deepEqual(modifierLevelOptions({ child_modifier_lists: [{
    name: 'Amount', modifiers: [{ id: 'lite', name: 'Lite' }, { id: 'reg', name: 'Reg' }],
  }] }), ['lite', 'reg']);
});

test('included shake flavors match Square fruit names and Cream/Creme spelling', () => {
  assert.equal(findShakeFlavorOption(item('Banana Milkshake'))?.id, banana.id);
  assert.equal(findShakeFlavorOption(item('Pineapple Milkshake'))?.id, pineapple.id);
  assert.equal(findShakeFlavorOption(item('Cookies and Creme Milkshake'))?.id, cookies.id);
  assert.equal(findShakeFlavorOption(item('Snow Day Bliss Milkshake')), null);
});

test('exact fruit names remain distinct from syrup flavors and ice cream bases', () => {
  const syrup = flavor('syrup', 'STRAWBERRY');
  const fruit = flavor('fruit', 'REAL FRUIT STRAWBERRY');
  assert.equal(findShakeFlavorOption(item('Real Fruit Strawberry Milkshake', [syrup, fruit]))?.id, fruit.id);
  assert.equal(findShakeFlavorOption({ name: 'Vanilla Milkshake', modifiers: [
    { name: 'SELECT THE BASE', modifiers: [flavor('vanilla-base', 'VANILLA ICE CREAM')] },
  ] }), null);
});

test('changing flavor amounts preserves unrelated follow-up choices', () => {
  const other = { id: 'light-ice', name: 'Light Ice', price: 0 };
  const changed = withModifierLevel(banana, { Ice: other }, 'extra');
  assert.deepEqual(changed.Ice, other);
  assert.equal(changed[amounts.name].id, 'square-extra');
  assert.deepEqual(withModifierLevel(banana, changed, 'reg'), { Ice: other });
});

test('editing an item restores separate nested flavor amounts', () => {
  const group = { name: 'Drink', selection_type: 'SINGLE', modifiers: [{
    id: 'soda', name: 'Soda', child_modifier_lists: [{
      name: 'Flavors', selection_type: 'MULTIPLE', modifiers: [banana, pineapple],
    }],
  }] };
  const restored = restorePanelSelection([group], { selectedModifiers: [
    { id: 'soda' }, { id: banana.id },
    { id: 'square-lite', parent_modifier_id: banana.id },
    { id: pineapple.id }, { id: 'square-extra', parent_modifier_id: pineapple.id },
  ] });
  const chosen = restored.nested.soda.Flavors;
  assert.equal(chosen[0].nestedSelections[amounts.name].id, 'square-lite');
  assert.equal(chosen[1].nestedSelections[amounts.name].id, 'square-extra');
});