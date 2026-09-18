import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Check, Sparkles, Clock } from 'lucide-react';
import { buildDeluxeLabelFull } from '@/lib/deluxeLabel';
import { useCart } from '@/context/CartContext';
import { isHappyHourItem, getHappyHourItemPrice, getHappyHourConfig } from '@/lib/happyHour';
import { base44 } from '@/api/base44Client';
import { DELUXE_ENABLED, getDeluxePresetsForItem, isDeluxePresetActive, applyDeluxePreset, presetTrackedToppings } from '@/lib/deluxeConfig';
import { trackViewItem, foodItemToGa4 } from '@/lib/ga4Ecommerce';

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
  const [isCombo, setIsCombo] = useState(false);
  const [comboSides, setComboSides] = useState(null);

  const { menuSetting } = useCart();

  // Happy Hour pricing — eligible items show a struck-through base price and
  // discounted total so the modal matches what the cart will actually charge.
  const isHappyHour = isHappyHourItem(item, menuSetting);
  const happyHourPrice = isHappyHour ? getHappyHourItemPrice(item, menuSetting) : null;
  const hhConfig = isHappyHour ? getHappyHourConfig(menuSetting) : null;
  const hhPct = hhConfig ? (hhConfig.discount_percent || 0) / 100 : 0;

  // Combo toggle — only for burger items. Fetches the fries + shake so the
  // customer can bundle them into an Isle Combo right from the item modal.
  const isBurger = /burger/i.test(item.name);
  useEffect(() => {
    if (!isBurger) return;
    let cancelled = false;
    base44.entities.MenuItem.list('-name', 200).then(items => {
      if (cancelled) return;
      const fries = items.find(i => i.name === 'French Fries' && i.is_available && !i.is_hidden);
      const shake = items.find(i => i.name === 'Vanilla Milkshake' && i.is_available && !i.is_hidden);
      if (fries && shake) setComboSides({ fries, shake });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isBurger]);

  const COMBO_DISCOUNT = 1.50;
  const comboAddOn = comboSides ? +(comboSides.fries.price + comboSides.shake.price - COMBO_DISCOUNT).toFixed(2) : 0;

  useEffect(() => {
    trackViewItem(foodItemToGa4(item), { value: item.price });
  }, [item]);

  // Deluxe presets — one-tap shortcuts that each select a fixed set of toppings.
  const deluxePresets = DELUXE_ENABLED ? getDeluxePresetsForItem(item) : [];

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
    allToppings: p.toppings,
  }));
  const { label: deluxeLabel, allToppings: deluxeAllToppings } = DELUXE_ENABLED
    ? buildDeluxeLabelFull(liveModifiers, labelPresets)
    : { label: null, allToppings: [] };

  const extraCost = Object.values(selections).reduce((sum, sel) => {
    if (!sel) return sum;
    if (Array.isArray(sel)) return sum + sel.reduce((s, m) => s + (m.price || 0), 0);
    return sum + (sel.price || 0);
  }, 0);

  // Total shown in the footer — reflects happy hour discount and combo add-on
  // so it matches what the cart will actually charge.
  const itemTotal = isHappyHour ? (item.price + extraCost) * (1 - hhPct) : item.price + extraCost;
  const footerTotal = itemTotal + (isCombo ? comboAddOn : 0);

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
    const { label, allToppings } = DELUXE_ENABLED
      ? buildDeluxeLabelFull(selectedMods, labelPresets)
      : { label: null, allToppings: [] };
    const comboItems = isCombo && comboSides
      ? [
          { ...comboSides.fries, id: `combo-${comboSides.fries.id}`, quantity: 1, selectedModifiers: [] },
          { ...comboSides.shake, id: `combo-${comboSides.shake.id}`, name: `${comboSides.shake.name} (Isle Combo)`, price: +(comboSides.shake.price - COMBO_DISCOUNT).toFixed(2), quantity: 1, selectedModifiers: [] },
        ]
      : [];
    onConfirm(selectedMods, extraCost, label, allToppings, comboItems);
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
            {isHappyHour && (
              <div className="mt-2 inline-flex items-center gap-1.5 bg-midnight-cherry text-white text-xs font-heading px-3 py-1 rounded-full">
                <Clock size={12} /> Happy Hour · Online
              </div>
            )}
            {isHappyHour && happyHourPrice !== null && (
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-sm text-muted-foreground line-through">${item.price.toFixed(2)}</span>
                <span className="font-heading text-lg text-midnight-cherry">${happyHourPrice.toFixed(2)}</span>
              </div>
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
          {/* Isle Combo toggle — burgers only */}
          {isBurger && comboSides && (
            <div className="space-y-2">
              <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">Make it a combo?</h4>
              <button
                type="button"
                onClick={() => setIsCombo(false)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                  !isCombo
                    ? 'border-midnight-cherry bg-red-50'
                    : 'border-border hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-all ${
                    !isCombo ? 'bg-midnight-cherry border-midnight-cherry' : 'border-gray-300'
                  }`}>
                    {!isCombo && <Check size={12} className="text-white" />}
                  </div>
                  <span className="font-body text-sm text-obsidian-roast">Burger Only</span>
                </div>
                <span className="text-sm text-patina-mint font-semibold">${item.price.toFixed(2)}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCombo(true)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all text-left ${
                  isCombo
                    ? 'border-midnight-cherry bg-midnight-cherry text-white'
                    : 'border-midnight-cherry/40 bg-midnight-cherry/5 text-midnight-cherry hover:bg-midnight-cherry/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-all ${
                    isCombo ? 'bg-white border-white' : 'border-midnight-cherry'
                  }`}>
                    {isCombo && <Check size={12} className="text-midnight-cherry" />}
                  </div>
                  <div>
                    <span className="font-heading text-sm flex items-center gap-1.5">
                      <Sparkles size={14} /> Make it an Isle Combo
                    </span>
                    <span className={`block text-xs mt-0.5 ${isCombo ? 'text-white/80' : 'text-muted-foreground'}`}>
                      Crinkle Fries + Hand-Dipped Shake
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold">+${comboAddOn.toFixed(2)}</span>
                  <span className={`block text-xs ${isCombo ? 'text-white/80' : 'text-midnight-cherry'}`}>save ${COMBO_DISCOUNT.toFixed(2)}</span>
                </div>
              </button>
            </div>
          )}

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
            Add to Order — ${footerTotal.toFixed(2)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}