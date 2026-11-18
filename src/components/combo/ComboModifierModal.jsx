import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { applyModifierOverrides } from '@/lib/modifierOverrides';
import { round2 } from '@/lib/comboIsle';
import { atMax, ruleBadge } from '@/lib/modifierRules';
import { modifierLevelOptions, levelFromNested, withModifierLevel } from '@/lib/modifierLevels';
import { mergeNestedIntoParent } from '@/components/NestedModifierLists';
import ModifierTile from '@/components/ModifierTile';
import PlainOptionPills from '@/components/PlainOptionPills';
import { isPillOption } from '@/lib/plainOption';
import { getModifierPhoto } from '@/lib/modifierPhotos';

// A combo component keeps the same Square modifier choices and prices it has
// everywhere else on the site.
export default function ComboModifierModal({ item, overrides, onClose, onConfirm }) {
  const groups = applyModifierOverrides(item.modifiers, overrides);

  const initSelections = () => {
    if (!groups.length) return {};
    return groups.reduce((acc, group) => {
      acc[group.name] = group.selection_type === 'MULTIPLE'
        ? []
        : (group.name === 'Size' ? (group.modifiers.find((m) => !m.sold_out) || group.modifiers[0]) : null);
      return acc;
    }, {});
  };

  const [selections, setSelections] = useState(initSelections);
  // Lite / Reg / Ex per chosen option — the same level every other ordering
  // surface records, so a combo box prices and prints a build the same way.
  const [nested, setNested] = useState({});

  const toggleSingle = (groupName, mod) =>
    setSelections((prev) => ({
      ...prev,
      [groupName]: prev[groupName]?.id === mod.id ? (groupName === 'Size' ? mod : null) : mod,
    }));

  // Square's maximum carries into the Combo Isle exactly as it does everywhere
  // else: once the group holds as many picks as Square allows, one more tap
  // cannot add another. Taking an option off is always allowed.
  const toggleMultiple = (groupName, mod) =>
    setSelections((prev) => {
      const current = prev[groupName] || [];
      const exists = current.find((m) => m.id === mod.id);
      if (exists) return { ...prev, [groupName]: current.filter((m) => m.id !== mod.id) };
      const group = groups.find((g) => g.name === groupName);
      if (group && atMax(group, current)) return prev;
      return { ...prev, [groupName]: [...current, mod] };
    });

  // Each chosen option folded with its Lite/Extra level: the level merges into
  // the name ("Extra Pickles") and its price, exactly as the bag lists it.
  const selectedEntries = Object.entries(selections)
    .filter(([, sel]) => sel)
    .flatMap(([groupName, sel]) =>
      (Array.isArray(sel) ? sel : [sel]).filter(Boolean).flatMap((m) => {
        const merged = mergeNestedIntoParent({ id: m.id, name: m.name, price: m.price }, nested[m.id] || {});
        return [
          { id: m.id, group: groupName, name: merged.mergedName, price: merged.mergedPrice },
          ...merged.silentEntries,
        ];
      }));

  const extraCost = selectedEntries.reduce((sum, m) => sum + (m.price || 0), 0);

  const handleConfirm = () => onConfirm(selectedEntries, extraCost);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-float-lg w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex-1 mr-4">
            <h3 className="font-heading text-xl text-obsidian-roast">{item.name}</h3>
            {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {groups.map((group) => (
            <div key={group.name}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">{group.name}</h4>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {ruleBadge(group)}
                </span>
              </div>
              {/* Combo components pick their Square options with the same tile
                  every other ordering surface uses. */}
              <PlainOptionPills
                options={group.modifiers}
                groupName={group.name}
                isSelected={(mod) => (group.selection_type === 'MULTIPLE'
                  ? (selections[group.name] || []).some((m) => m.id === mod.id)
                  : selections[group.name]?.id === mod.id)}
                onToggle={(mod) => (group.selection_type === 'MULTIPLE' ? toggleMultiple(group.name, mod) : toggleSingle(group.name, mod))}
              />
              <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 120px))', gap: '6px', justifyContent: 'center' }}>
                {group.modifiers.filter((mod) => !isPillOption(mod.name, group.name)).map((mod) => {
                  const isMultiple = group.selection_type === 'MULTIPLE';
                  const isSelected = isMultiple
                    ? (selections[group.name] || []).some((m) => m.id === mod.id)
                    : selections[group.name]?.id === mod.id;
                  return (
                    <ModifierTile
                      key={mod.id}
                      name={mod.name}
                      price={mod.price}
                      photo={getModifierPhoto(mod.name)}
                      disabled={mod.sold_out}
                      state={isSelected ? (levelFromNested(nested[mod.id]) || 'reg') : null}
                      levels={modifierLevelOptions(mod)}
                      onSelect={(next) => {
                        // Tapping the active option's photo or name takes it off;
                        // tapping a level on it only changes the amount.
                        if (next == null) {
                          if (!isSelected) return;
                          if (isMultiple) toggleMultiple(group.name, mod);
                          else toggleSingle(group.name, mod);
                          setNested((prev) => { const copy = { ...prev }; delete copy[mod.id]; return copy; });
                          return;
                        }
                        if (!isSelected) {
                          if (isMultiple) toggleMultiple(group.name, mod);
                          else toggleSingle(group.name, mod);
                        }
                        setNested((prev) => ({ ...prev, [mod.id]: withModifierLevel(mod, prev[mod.id], next) }));
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-border">
          <button onClick={handleConfirm} className="btn-cherry chrome-hover w-full py-4 font-heading text-sm flex items-center justify-center gap-2">
            <Plus size={16} /> Confirm — ${round2(item.price + extraCost).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}