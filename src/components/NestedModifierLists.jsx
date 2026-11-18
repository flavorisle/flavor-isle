import React from 'react';
import { ruleBadge, atMax } from '@/lib/modifierRules';
import ModifierTile from '@/components/ModifierTile';
import PlainOptionPills from '@/components/PlainOptionPills';
import { isPlainOption } from '@/lib/plainOption';
import { getModifierPhoto } from '@/lib/modifierPhotos';

// Renders Square nested modifier lists — the follow-up choices that appear
// when a parent modifier is selected. For example, selecting a soda reveals
// "How much ice?" and "Add a flavor to your drink"; selecting a sauce reveals
// "Preferences on Sauce" (Lite/Regular/Extra).
//
// The parent modifier's child_modifier_lists are stored on the MenuItem by
// syncSquareCatalog. This component renders those child lists as pill-button
// groups, styled as a subtle indented sub-section beneath the parent.
//
// Selection state is owned by the parent component and passed in/out via
// nestedSelections + onChange so it can be flattened into the cart item's
// selectedModifiers on confirm.
//
// Props:
//   parentMod         — the selected modifier object (has child_modifier_lists)
//   nestedSelections  — { [childListName]: childMod | [childMod, ...] }
//   onChange           — (newNestedSelections) => void
export default function NestedModifierLists({ parentMod, nestedSelections, onChange, hiddenListId }) {
  const childLists = parentMod?.child_modifier_lists;
  if (!childLists || childLists.length === 0) return null;

  const toggleSingle = (listName, mod) => {
    const cur = nestedSelections || {};
    onChange({
      ...cur,
      [listName]: cur?.[listName]?.id === mod.id ? null : mod,
    });
  };

  const toggleMultiple = (list, mod) => {
    const cur = nestedSelections || {};
    const arr = cur[list.name] || [];
    if (arr.find(m => m.id === mod.id)) {
      onChange({ ...cur, [list.name]: arr.filter(m => m.id !== mod.id) });
      return;
    }
    // Square's maximum for this list: once it holds that many picks, one more
    // tap cannot add another.
    if (atMax(list, arr)) return;
    onChange({ ...cur, [list.name]: [...arr, mod] });
  };

  return (
    <div className="mt-3 ml-3 pl-3 border-l-2 border-midnight-cherry/20 space-y-4">
      {childLists.filter(list => !isPreferenceList(list) && list.id !== hiddenListId).map(list => (
        <div key={list.name} className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-heading text-xs uppercase tracking-widest text-obsidian-roast">{list.name}</h4>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {ruleBadge(list)}
            </span>
          </div>
          {/* Follow-up choices are tiles too, one size down to fit the indent. */}
          <PlainOptionPills
            options={list.modifiers || []}
            isSelected={(mod) => (list.selection_type === 'MULTIPLE'
              ? (nestedSelections?.[list.name] || []).some((m) => m.id === mod.id)
              : nestedSelections?.[list.name]?.id === mod.id)}
            onToggle={(mod) => (list.selection_type === 'MULTIPLE' ? toggleMultiple(list, mod) : toggleSingle(list.name, mod))}
          />
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 120px))', gap: '8px', justifyContent: 'center' }}>
            {(list.modifiers || []).filter((mod) => !isPlainOption(mod.name)).map(mod => {
              const isMultiple = list.selection_type === 'MULTIPLE';
              const sel = nestedSelections?.[list.name];
              const isSelected = isMultiple
                ? (sel || []).some(m => m.id === mod.id)
                : sel?.id === mod.id;
              return (
                <ModifierTile
                  key={mod.id}
                  size="sm"
                  name={mod.name}
                  price={mod.price}
                  photo={getModifierPhoto(mod.name)}
                  disabled={mod.sold_out}
                  state={isSelected ? 'reg' : null}
                  onSelect={(next) => {
                    const on = next != null;
                    if (on === isSelected) return;
                    if (isMultiple) toggleMultiple(list, mod);
                    else toggleSingle(list.name, mod);
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const norm = (s) => (s || '').toString().toLowerCase().trim();

// Preference lists have short option names like "Lite", "Regular", "Extra" —
// these merge into the parent modifier's name ("Extra Pickle") instead of
// showing as a confusing standalone "Extra" entry. Lists with descriptive
// options like "Light Ice" / "Extra Ice" are NOT preference lists — those
// options are already self-descriptive and stay as separate entries.
const PREFERENCE_WORDS = new Set(['lite', 'light', 'regular', 'normal', 'extra']);

function isPreferenceList(list) {
  const names = (list.modifiers || []).map(m => norm(m.name));
  if (names.length === 0) return false;
  return names.every(n => PREFERENCE_WORDS.has(n));
}

function pushAddOn(addOns, listName, sel) {
  if (Array.isArray(sel)) {
    sel.forEach(m => addOns.push({ group: listName, name: m.name, price: m.price, id: m.id }));
  } else if (sel) {
    addOns.push({ group: listName, name: sel.name, price: sel.price, id: sel.id });
  }
}

// Merges preference selections (Lite/Extra) into the parent modifier's name
// and returns any remaining add-on selections as separate entries.
// "Regular" adds no prefix. Returns { mergedName, mergedPrice, addOns }.
export function mergeNestedIntoParent(parentMod, nested) {
  let mergedName = parentMod.name;
  let mergedPrice = parentMod.price || 0;
  const addOns = [];
  const silentEntries = [];
  for (const [listName, sel] of Object.entries(nested || {})) {
    if (!sel) continue;
    const selName = Array.isArray(sel) ? (sel[0]?.name || '') : (sel?.name || '');
    const selPrice = Array.isArray(sel) ? (sel[0]?.price || 0) : (sel?.price || 0);
    const selId = Array.isArray(sel) ? (sel[0]?.id || '') : (sel?.id || '');
    const n = norm(selName);
    // Merge preference selections (Lite/Regular/Extra) into the parent name
    // so summaries show "Extra Pickle" instead of a standalone "Extra".
    // Check the selection name directly so this works even when the child
    // list has non-preference options that prevent isPreferenceList() from
    // matching.
    if (n === 'regular' || n === 'normal') {
      if (selId) silentEntries.push({ group: listName, name: '', price: 0, id: selId, silent: true });
      continue;
    }
    if (n === 'extra') {
      mergedName = `Extra ${mergedName}`;
      mergedPrice += selPrice;
      if (selId) silentEntries.push({ group: listName, name: '', price: 0, id: selId, silent: true });
      continue;
    }
    if (n === 'lite' || n === 'light') {
      mergedName = `${selName} ${mergedName}`;
      mergedPrice += selPrice;
      if (selId) silentEntries.push({ group: listName, name: '', price: 0, id: selId, silent: true });
      continue;
    }
    pushAddOn(addOns, listName, sel);
  }
  return { mergedName, mergedPrice, addOns, silentEntries };
}

// Flattens a single modifier + its nested selections into cart-ready entries.
// Preference selections merge into the parent name; add-on selections are
// pushed as separate entries. Used by ModifierModal and ProductModifierPanel
// for both the live Deluxe label and the confirm handler.
export function flattenModifierWithNested(mod, group, nested) {
  if (!nested) return [{ group, name: mod.name, price: mod.price, id: mod.id }];
  const { mergedName, mergedPrice, addOns, silentEntries } = mergeNestedIntoParent(mod, nested);
  return [
    { group, name: mergedName, price: mergedPrice, id: mod.id },
    ...addOns,
    ...silentEntries,
  ];
}

// Flattens a nestedSelections object into a cart-ready modifier list.
// Used by ModifierModal and ProductModifierPanel on confirm to fold nested
// selections into the cart item's selectedModifiers array.
export function flattenNestedSelections(nested) {
  const out = [];
  for (const [listName, sel] of Object.entries(nested || {})) {
    if (!sel) continue;
    if (Array.isArray(sel)) {
      sel.forEach(m => out.push({ group: listName, name: m.name, price: m.price, id: m.id }));
    } else {
      out.push({ group: listName, name: sel.name, price: sel.price, id: sel.id });
    }
  }
  return out;
}

// Sums the price delta of all selections in a nestedSelections object.
export function nestedSelectionsExtra(nested) {
  return Object.values(nested || {}).reduce((sum, sel) => {
    if (!sel) return sum;
    if (Array.isArray(sel)) return sum + sel.reduce((s, m) => s + (m.price || 0), 0);
    return sum + (sel.price || 0);
  }, 0);
}