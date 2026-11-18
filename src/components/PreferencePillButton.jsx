import React from 'react';
import ModifierTile from '@/components/ModifierTile';
import { getModifierPhoto } from '@/lib/modifierPhotos';

// Issue #324 — an option whose own child list offers Lite / Regular / Extra is
// a tile like every other option: the photo (or its first letter) on top, the
// option name, and the Lite / Reg / Ex strip underneath. The strip writes the
// same nested selection the old pill wrote, so price and ticket are unchanged.

const norm = (s) => (s || '').toString().toLowerCase().trim();
const PREFERENCE_WORDS = new Set(['lite', 'light', 'regular', 'normal', 'extra']);

// Finds the preference-type child list (Lite/Regular/Extra) on a modifier.
// Returns the child list object, or null if the modifier has no preference list.
export function getPreferenceList(mod) {
  const lists = mod?.child_modifier_lists || [];
  for (const list of lists) {
    const names = (list.modifiers || []).map((m) => norm(m.name));
    if (names.length > 0 && names.every((n) => PREFERENCE_WORDS.has(n))) {
      return list;
    }
  }
  return null;
}

function getPreferenceOptions(list) {
  const opts = { lite: null, regular: null, extra: null };
  for (const m of (list?.modifiers || [])) {
    const n = norm(m.name);
    if (n === 'lite' || n === 'light') opts.lite = m;
    else if (n === 'regular' || n === 'normal') opts.regular = m;
    else if (n === 'extra') opts.extra = m;
  }
  return opts;
}

export default function PreferencePillButton({
  mod,
  isSelected,
  onToggle,
  nestedSelection,
  onNestedChange,
}) {
  const prefList = getPreferenceList(mod);
  if (!prefList) return null;

  const { lite, extra } = getPreferenceOptions(prefList);
  const currentPref = nestedSelection?.[prefList.name];
  const prefName = currentPref ? norm(currentPref.name) : null;
  const level = prefName === 'extra' ? 'extra' : prefName === 'lite' || prefName === 'light' ? 'lite' : null;

  const select = (next) => {
    if (next == null) {
      if (isSelected) {
        onToggle();
        onNestedChange({});
      }
      return;
    }
    if (!isSelected) onToggle();
    if (next === 'reg') {
      onNestedChange({});
      return;
    }
    const pick = next === 'lite' ? lite : extra;
    onNestedChange(pick ? { [prefList.name]: pick } : {});
  };

  return (
    <ModifierTile
      name={mod.name}
      price={mod.price}
      photo={getModifierPhoto(mod.name)}
      state={isSelected ? (level || 'reg') : null}
      onSelect={select}
    />
  );
}