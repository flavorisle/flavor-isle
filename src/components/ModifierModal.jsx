import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Check, Sparkles } from 'lucide-react';
import { buildDeluxeLabel } from '@/lib/deluxeLabel';
import { getDeluxePresetsForItem, isDeluxePresetActive, applyDeluxePreset, presetTrackedToppings } from '@/lib/deluxeConfig';

export default function ModifierModal({ item, onClose, onConfirm }) {
  const hasModifiers = item.modifiers && item.modifiers.length > 0;

  // Initialize selections: SINGLE → null, MULTIPLE → []
  const initSelections = () => {
    if (!hasModifiers) return {};
    return item.modifiers.reduce((acc, group) => {
      // Size groups default to the first option so every item carries a size.
      acc[group.name] = group.selection_type === 'MULTIPLE'
        ? []
        : (group.name === 'Size' ? (group.modifiers.find(m => !m.sold_out) || group.modifiers[0]) : null);
      return acc;
    }, {});
  };

  const [selections, setSelections] = useState(initSelections);

  // Deluxe presets — one-tap shortcuts that each select a fixed set of toppings.
  const deluxePresets = getDeluxePresetsForItem(item);

  const toggleDeluxe = (preset) => {
    setSelections((prev) => applyDeluxePreset(prev, preset, !isDeluxePresetActive(prev, preset)));
  };

  const toggleSingle = (groupName, mod) => {
    setSelections(prev => ({
      ...prev,
      // Size is required — tapping the selected size keeps it instead of clearing it.
      [groupName]: prev[groupName]?.id === mod.id ? (groupName === 'Size' ? mod : null) : mod,
    }));
  };

  const toggleMultiple = (groupName, mod) => {
    setSelections(prev => {
      const current = prev[groupName] || [];
      const exists = current.find(m => m.id === mod.id);
      return {
        ...prev,
        [groupName]: exists ? current.filter(m => m.id !== mod.id) : [...current, mod],
      };
    });
  };

  // Flatten the current selections into the same shape used by the cart so the
  // Deluxe label can update live as the customer toggles toppings.
  const liveModifiers = [];
  for (const [groupName, sel] of Object.entries(selections)) {
    if (!sel) continue;
    if (Array.isArray(sel)) {
      sel.forEach((m) => liveModifiers.push({ group: groupName, name: m.name, price: m.price, id: m.id }));
    } else {
      liveModifiers.push({ group: groupName, name: sel.name, price: sel.price, id: sel.id });
    }
  }
  const labelPresets = deluxePresets.map((p) => ({
    name: p.name,
    trackedToppings: presetTrackedToppings(p, p.modifiers.map((m) => m.name)),
  }));
  const deluxeLabel = buildDeluxeLabel(liveModifiers, labelPresets);

  const extraCost = Object.values(selections).reduce((sum, sel) => {
    if (!sel) return sum;
    if (Array.isArray(sel)) return sum + sel.reduce((s, m) => s + (m.price || 0), 0);
    return sum + (sel.price || 0);
  }, 0);

  const handleConfirm = () => {
    const selectedMods = [];
    for (const [groupName, sel] of Object.entries(selections)) {
      if (!sel) continue;
      if (Array.isArray(sel)) {
        sel.forEach(m => selectedMods.push({ group: groupName, name: m.name, price: m.price, id: m.id }));
      } else {
        selectedMods.push({ group: groupName, name: sel.name, price: sel.price, id: sel.id });
      }
    }
    onConfirm(selectedMods, extraCost);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-float-lg w-full sm:max-w-md h-[85dvh] sm:h-auto sm:max-h-[85dvh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border flex-shrink-0">
          <div className="flex-1 mr-4">
            <h3 className="font-heading text-xl text-obsidian-roast">{item.name}</h3>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
            )}
            {deluxeLabel && (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-midnight-cherry/10 text-midnight-cherry text-xs font-heading px-3 py-1 rounded-full">
                <Sparkles size={12} />
                {deluxeLabel}
              </div>
            )}
          </div>
          <button onClick={onClose} className="tap-44 flex items-center justify-center hover:bg-muted rounded-full transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Modifier Groups */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-6">
          {deluxePresets.length > 0 && deluxePresets.map((preset) => {
            const active = isDeluxePresetActive(selections, preset);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => toggleDeluxe(preset)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${
                  active
                    ? 'border-midnight-cherry bg-midnight-cherry text-white'
                    : 'border-midnight-cherry/40 bg-midnight-cherry/5 text-midnight-cherry hover:bg-midnight-cherry/10'
                }`}
              >
                <span className="flex items-center gap-2 font-heading text-sm">
                  <Sparkles size={16} />
                  Make it {preset.name}
                </span>
                <span className="flex items-center gap-2 text-xs font-body">
                  {preset.modifiers.map((m) => m.name).join(', ')}
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full border-2 ${active ? 'bg-white border-white' : 'border-midnight-cherry'}`}>
                    {active && <Check size={12} className="text-midnight-cherry" />}
                  </span>
                </span>
              </button>
            );
          })}

          {hasModifiers ? (
            item.modifiers.map(group => (
              <div key={group.name}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">{group.name}</h4>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {group.selection_type === 'MULTIPLE' ? 'Choose any' : 'Choose one'}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.modifiers.map(mod => {
                    const isMultiple = group.selection_type === 'MULTIPLE';
                    const isSelected = isMultiple
                      ? (selections[group.name] || []).some(m => m.id === mod.id)
                      : selections[group.name]?.id === mod.id;

                    return (
                      <button
                        key={mod.id}
                        type="button"
                        disabled={mod.sold_out}
                        onClick={() => isMultiple ? toggleMultiple(group.name, mod) : toggleSingle(group.name, mod)}
                        className={`w-full min-h-[44px] flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                          mod.sold_out
                            ? 'border-border bg-muted opacity-50 cursor-not-allowed'
                            : isSelected
                              ? 'border-midnight-cherry bg-red-50'
                              : 'border-border hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-all ${
                            isSelected ? 'bg-midnight-cherry border-midnight-cherry' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                          <span className="font-body text-sm text-obsidian-roast">{mod.name}</span>
                        </div>
                        {mod.sold_out ? (
                          <span className="text-xs text-muted-foreground font-semibold uppercase">Sold Out</span>
                        ) : mod.price > 0 && (
                          <span className="text-sm text-patina-mint font-semibold">+${mod.price.toFixed(2)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No customizations available.</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex-shrink-0 bg-white safe-bottom">
          <button
            type="button"
            onClick={handleConfirm}
            className="btn-cherry chrome-hover w-full py-4 font-heading text-sm flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add to Order — ${(item.price + extraCost).toFixed(2)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}