import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { applyModifierOverrides } from '@/lib/modifierOverrides';
import { round2 } from '@/lib/comboIsle';
import ModifierTile from '@/components/ModifierTile';
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

  const toggleSingle = (groupName, mod) =>
    setSelections((prev) => ({
      ...prev,
      [groupName]: prev[groupName]?.id === mod.id ? (groupName === 'Size' ? mod : null) : mod,
    }));

  const toggleMultiple = (groupName, mod) =>
    setSelections((prev) => {
      const current = prev[groupName] || [];
      const exists = current.find((m) => m.id === mod.id);
      return {
        ...prev,
        [groupName]: exists ? current.filter((m) => m.id !== mod.id) : [...current, mod],
      };
    });

  const extraCost = Object.values(selections).reduce((sum, sel) => {
    if (!sel) return sum;
    if (Array.isArray(sel)) return sum + sel.reduce((s, m) => s + (m.price || 0), 0);
    return sum + (sel.price || 0);
  }, 0);

  const handleConfirm = () => {
    const selectedMods = [];
    for (const [groupName, sel] of Object.entries(selections)) {
      if (!sel) continue;
      if (Array.isArray(sel)) sel.forEach((m) => selectedMods.push({ id: m.id, group: groupName, name: m.name, price: m.price }));
      else selectedMods.push({ id: sel.id, group: groupName, name: sel.name, price: sel.price });
    }
    onConfirm(selectedMods, extraCost);
  };

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
                  {group.selection_type === 'MULTIPLE' ? 'Choose any' : 'Choose one'}
                </span>
              </div>
              {/* Combo components pick their Square options with the same tile
                  every other ordering surface uses. */}
              <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 148px))', gap: '8px', justifyContent: 'center' }}>
                {group.modifiers.map((mod) => {
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
                      state={isSelected ? 'reg' : null}
                      onSelect={(next) => {
                        const on = next != null;
                        if (on === isSelected) return;
                        if (isMultiple) toggleMultiple(group.name, mod);
                        else toggleSingle(group.name, mod);
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