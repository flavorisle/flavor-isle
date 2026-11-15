import React, { useState } from 'react';
import { Check, X, Plus } from 'lucide-react';
import { applyModifierOverrides } from '@/lib/modifierOverrides';
import { round2 } from '@/lib/comboIsle';

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
              <div className={group.modifiers.length > 10 ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
                {group.modifiers.map((mod) => {
                  const isMultiple = group.selection_type === 'MULTIPLE';
                  const isSelected = isMultiple
                    ? (selections[group.name] || []).some((m) => m.id === mod.id)
                    : selections[group.name]?.id === mod.id;
                  return (
                    <button
                      key={mod.id}
                      disabled={mod.sold_out}
                      onClick={() => (isMultiple ? toggleMultiple(group.name, mod) : toggleSingle(group.name, mod))}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${mod.sold_out ? 'border-border bg-muted opacity-50 cursor-not-allowed' : isSelected ? 'border-midnight-cherry bg-red-50' : 'border-border hover:border-gray-300 bg-white'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-all ${isSelected ? 'bg-midnight-cherry border-midnight-cherry' : 'border-gray-300'}`}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                        <span className="font-body text-sm text-obsidian-roast">{mod.name}</span>
                      </div>
                      {mod.sold_out ? (
                        <span className="text-xs text-muted-foreground font-semibold uppercase">Sold Out</span>
                      ) : mod.price > 0 && <span className="text-sm text-patina-mint font-semibold">+${mod.price.toFixed(2)}</span>}
                    </button>
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