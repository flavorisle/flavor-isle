import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Check, Sparkles, Clock } from 'lucide-react';
import { buildDeluxeLabelFull, buildFullDeluxeLabel } from '@/lib/deluxeLabel';
import { useCart } from '@/context/CartContext';
import { isHappyHourItem, getHappyHourItemPrice, getHappyHourConfig } from '@/lib/happyHour';
import { resolveFlavorName, resolveFlavorEmoji } from '@/lib/shakeConfig';
import { getComboData, COMBO_DISCOUNT } from '@/lib/comboData';
import { DELUXE_ENABLED, getDeluxePresetsForItem, isDeluxePresetActive, applyDeluxePreset, presetTrackedToppings } from '@/lib/deluxeConfig';
import { trackViewItem, foodItemToGa4 } from '@/lib/ga4Ecommerce';

// Inline modifier selection panel for the two-column ProductDetail page.
// Contains the same modifier, combo builder, deluxe preset, and happy hour
// logic as ModifierModal — but renders inline (no portal/modal wrapper) so
// the left column can own the product summary, quantity, and Add to Bag CTA.
// The parent drives confirm() and reads live state via onStateChange.
const ProductModifierPanel = forwardRef(function ProductModifierPanel(
  { item, onConfirm, onStateChange },
  ref,
) {
  const hasModifiers = item.modifiers && item.modifiers.length > 0;
  const soldOut = item.is_available === false;

  // Initialize selections: SINGLE → null, MULTIPLE → []
  const initSelections = () => {
    if (!hasModifiers) return {};
    return item.modifiers.reduce((acc, group) => {
      acc[group.name] = group.selection_type === 'MULTIPLE'
        ? []
        : (group.name === 'Size' ? (group.modifiers.find(m => !m.sold_out) || group.modifiers[0]) : null);
      return acc;
    }, {});
  };

  const [selections, setSelections] = useState(initSelections);
  const [isCombo, setIsCombo] = useState(false);
  const [comboData, setComboData] = useState(null);
  const [comboSide, setComboSide] = useState(null);
  const [comboDrinkType, setComboDrinkType] = useState(null);
  const [comboFlavor, setComboFlavor] = useState(null);
  const [comboSoda, setComboSoda] = useState(null);
  const [comboSideMods, setComboSideMods] = useState({});
  const [comboShakeMods, setComboShakeMods] = useState({});
  const [comboDrinkMods, setComboDrinkMods] = useState({});
  // Sequential combo builder steps:
  // 0 = "Pick a side" button, 1 = side list, 2 = side mods + "Pick drink" button,
  // 3 = drink type picker, 4 = soda choices or shake flavors + add-ons.
  const [comboStep, setComboStep] = useState(0);

  const { menuSetting } = useCart();

  const isHappyHour = isHappyHourItem(item, menuSetting);
  const happyHourPrice = isHappyHour ? getHappyHourItemPrice(item, menuSetting) : null;
  const hhConfig = isHappyHour ? getHappyHourConfig(menuSetting) : null;
  const hhPct = hhConfig ? (hhConfig.discount_percent || 0) / 100 : 0;

  const isBurger = /burger/i.test(item.name);
  useEffect(() => {
    if (!isBurger) return;
    let cancelled = false;
    getComboData().then(data => {
      if (cancelled || !data) return;
      setComboData(data);
    });
    return () => { cancelled = true; };
  }, [isBurger]);

  // Initialize side modifier selections whenever the chosen side changes.
  useEffect(() => {
    if (!comboSide) { setComboSideMods({}); return; }
    const init = {};
    (comboSide.modifiers || []).forEach(g => {
      init[g.name] = g.selection_type === 'MULTIPLE'
        ? []
        : (g.modifiers.find(m => !m.sold_out) || null);
    });
    setComboSideMods(init);
  }, [comboSide]);

  // Combo component modifier groups — each handled by a dedicated picker.
  const shakeFlavorGroup = comboData
    ? (comboData.shake.modifiers || []).find(g => {
        const lname = (g.name || '').toLowerCase();
        return lname.includes('flavor') && !lname.includes('extra');
      })
    : null;
  const shakeFlavorOpts = (shakeFlavorGroup?.modifiers || []).filter(m => !m.sold_out);
  const shakeSizeGroup = comboData ? (comboData.shake.modifiers || []).find(g => /size/i.test(g.name || '')) : null;
  const shakeExclude = [shakeFlavorGroup?.name, shakeSizeGroup?.name].filter(Boolean);

  const drinkSodaGroup = comboData ? (comboData.drink.modifiers || []).find(g => /soda choice/i.test(g.name || '')) : null;
  const sodaOpts = (drinkSodaGroup?.modifiers || []).filter(m => !m.sold_out);

  const drinkSizeGroup = comboData ? (comboData.drink.modifiers || []).find(g => /size/i.test(g.name || '')) : null;
  const drink20ozPrice = comboData ? (() => {
    const oz20 = (drinkSizeGroup?.modifiers || []).find(m => /20oz/i.test(m.name));
    return +(comboData.drink.price + (oz20?.price || 0)).toFixed(2);
  })() : 0;
  const drinkExclude = [drinkSodaGroup?.name, drinkSizeGroup?.name].filter(Boolean);

  // Initialize shake + drink "extra" modifier selections.
  useEffect(() => {
    if (!comboData) { setComboShakeMods({}); setComboDrinkMods({}); return; }
    const initExtras = (menuItem, excludeNames) => {
      const init = {};
      (menuItem?.modifiers || []).forEach(g => {
        const lname = (g.name || '').toLowerCase();
        if (excludeNames.some(n => lname === n.toLowerCase())) return;
        init[g.name] = g.selection_type === 'MULTIPLE'
          ? []
          : (g.modifiers.find(m => !m.sold_out) || null);
      });
      return init;
    };
    setComboShakeMods(initExtras(comboData.shake, shakeExclude));
    setComboDrinkMods(initExtras(comboData.drink, drinkExclude));
  }, [comboData]);

  const flavorExtra = comboFlavor?.price || 0;
  const modsExtra = (mods) => Object.values(mods || {}).reduce((sum, sel) => {
    if (!sel) return sum;
    if (Array.isArray(sel)) return sum + sel.reduce((s, m) => s + (m.price || 0), 0);
    return sum + (sel.price || 0);
  }, 0);
  const modsToCart = (mods) => {
    const out = [];
    for (const [groupName, sel] of Object.entries(mods || {})) {
      if (!sel) continue;
      if (Array.isArray(sel)) {
        sel.forEach(m => out.push({ group: groupName, name: m.name, price: m.price, id: m.id }));
      } else {
        out.push({ group: groupName, name: sel.name, price: sel.price, id: sel.id });
      }
    }
    return out;
  };
  // Flatten a mods object into a comma-separated list of selected modifier names
  // (e.g. "Ketchup, No Salt") for display in the combo summary.
  const modNames = (mods) => {
    const out = [];
    for (const sel of Object.values(mods || {})) {
      if (!sel) continue;
      if (Array.isArray(sel)) sel.forEach(m => out.push(m.name));
      else out.push(sel.name);
    }
    return out;
  };
  const sideModsExtra = modsExtra(comboSideMods);
  const sideModsToCart = modsToCart(comboSideMods);
  const shakeModsExtra = modsExtra(comboShakeMods);
  const shakeModsToCart = modsToCart(comboShakeMods);
  const drinkModsExtra = modsExtra(comboDrinkMods);
  const drinkModsToCart = modsToCart(comboDrinkMods);
  const comboAddOn = comboData && comboSide && comboDrinkType
    ? (comboDrinkType === 'shake'
        ? +(comboSide.price + sideModsExtra + comboData.shake.price + flavorExtra + shakeModsExtra - COMBO_DISCOUNT).toFixed(2)
        : +(comboSide.price + sideModsExtra + drink20ozPrice + drinkModsExtra - COMBO_DISCOUNT).toFixed(2))
    : 0;

  const comboReady = !!(comboData && comboSide && (comboDrinkType === 'shake' ? comboFlavor : comboSoda));

  useEffect(() => {
    trackViewItem(foodItemToGa4(item), { value: item.price });
  }, [item]);

  // Deluxe presets
  const deluxePresets = DELUXE_ENABLED ? getDeluxePresetsForItem(item) : [];

  const toggleDeluxe = (preset) => {
    setSelections((prev) => applyDeluxePreset(prev, preset, !isDeluxePresetActive(prev, preset)));
  };

  const toggleSingle = (groupName, mod) => {
    setSelections(prev => ({
      ...prev,
      [groupName]: prev[groupName]?.id === mod.id ? (groupName === 'Size' ? mod : null) : mod,
    }));
  };

  const toggleMultiple = (groupName, mod) => {
    setSelections(prev => {
      const current = prev[groupName] || [];
      const exists = current.find(m => m.id === mod.id);
      const isExclusive = /plain/i.test(mod.name) || /no\s*sauce/i.test(mod.name);
      if (exists) {
        return { ...prev, [groupName]: current.filter(m => m.id !== mod.id) };
      }
      if (isExclusive) {
        // Plain / No Sauce clears everything else in the group
        return { ...prev, [groupName]: [mod] };
      }
      // Selecting a regular topping/sauce removes any Plain/No Sauce
      const filtered = current.filter(m => !/plain/i.test(m.name) && !/no\s*sauce/i.test(m.name));
      return { ...prev, [groupName]: [...filtered, mod] };
    });
  };

  // Flatten selections for live deluxe label
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
    ? buildFullDeluxeLabel(liveModifiers, labelPresets, item)
    : { label: null, allToppings: [] };

  // The full label (preset + "add" extras + "sub/add" cheese) is shown in the
  // combo summary, badge, and stored on the cart item for consistent display
  // across the cart, checkout, and email receipts.
  const burgerModsLabel = deluxeLabel;

  const extraCost = Object.values(selections).reduce((sum, sel) => {
    if (!sel) return sum;
    if (Array.isArray(sel)) return sum + sel.reduce((s, m) => s + (m.price || 0), 0);
    return sum + (sel.price || 0);
  }, 0);

  const itemTotal = isHappyHour ? (item.price + extraCost) * (1 - hhPct) : item.price + extraCost;
  const footerTotal = itemTotal + (isCombo ? comboAddOn : 0);
  const ready = !soldOut && (!isCombo || comboReady);

  // Notify parent of live state so the left-column CTA can reflect it.
  useEffect(() => {
    onStateChange?.({
      total: footerTotal,
      isCombo,
      comboReady,
      comboAddOn,
      comboDrinkType,
      comboStep,
      comboSideName: comboSide?.name || null,
      comboSideModsLabel: modNames(comboSideMods).join(', ') || null,
      comboDrinkName: comboDrinkType === 'shake'
        ? (comboFlavor ? `${resolveFlavorName(comboFlavor.id, comboFlavor.name)} Milkshake` : null)
        : (comboSoda ? comboSoda.name : null),
      comboDrinkModsLabel: comboDrinkType === 'shake'
        ? (modNames(comboShakeMods).join(', ') || null)
        : (modNames(comboDrinkMods).join(', ') || null),
      deluxeLabel,
      burgerModsLabel,
      ready,
    });
  }, [footerTotal, isCombo, comboReady, comboAddOn, comboDrinkType, comboStep, comboSide, comboFlavor, comboSoda, comboSideMods, comboShakeMods, comboDrinkMods, deluxeLabel, burgerModsLabel, ready, onStateChange]);

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
      ? buildFullDeluxeLabel(selectedMods, labelPresets, item)
      : { label: null, allToppings: [] };
    const dSizeGroup = (comboData?.drink?.modifiers || []).find(g => /size/i.test(g.name || ''));
    const d20ozMod = (dSizeGroup?.modifiers || []).find(m => /20oz/i.test(m.name));
    const comboItems = isCombo && comboData && comboSide && (comboDrinkType === 'shake' ? comboFlavor : comboSoda)
      ? (comboDrinkType === 'shake'
        ? [
            { ...comboSide, id: `combo-${comboSide.id}`, productId: comboSide.id, comboParentId: item.id, price: +(comboSide.price + sideModsExtra).toFixed(2), quantity: 1, selectedModifiers: sideModsToCart },
            {
              ...comboData.shake,
              id: `combo-${comboData.shake.id}`,
              productId: comboData.shake.id,
              comboParentId: item.id,
              name: `${resolveFlavorName(comboFlavor.id, comboFlavor.name)} Milkshake`,
              price: +(comboData.shake.price + (comboFlavor.price || 0) + shakeModsExtra - COMBO_DISCOUNT).toFixed(2),
              quantity: 1,
              selectedModifiers: [
                { id: comboFlavor.id, name: resolveFlavorName(comboFlavor.id, comboFlavor.name), price: comboFlavor.price },
                ...shakeModsToCart,
              ],
            },
          ]
        : [
            { ...comboSide, id: `combo-${comboSide.id}`, productId: comboSide.id, comboParentId: item.id, price: +(comboSide.price + sideModsExtra).toFixed(2), quantity: 1, selectedModifiers: sideModsToCart },
            {
              ...comboData.drink,
              id: `combo-${comboData.drink.id}`,
              productId: comboData.drink.id,
              comboParentId: item.id,
              name: comboSoda.name,
              price: +(drink20ozPrice + drinkModsExtra - COMBO_DISCOUNT).toFixed(2),
              quantity: 1,
              selectedModifiers: [
                { id: comboSoda.id, name: comboSoda.name, price: comboSoda.price },
                ...(d20ozMod ? [{ id: d20ozMod.id, name: d20ozMod.name, price: d20ozMod.price }] : []),
                ...drinkModsToCart,
              ],
            },
          ])
      : [];
    onConfirm(selectedMods, extraCost, label, allToppings, comboItems);
  };

  useImperativeHandle(ref, () => ({
    confirm: handleConfirm,
    isReady: () => ready,
    toggleCombo: () => setIsCombo(prev => !prev),
    setCombo: (val) => { setIsCombo(val); setComboStep(0); },
    editComboStep: (step) => { setIsCombo(true); setComboStep(step); },
  }));

  // Renders a combo item's "extra" modifier groups — every group not already
  // handled by a dedicated picker. Reused for the side, shake, and drink.
  const renderExtraGroups = (comboItem, excludeMatchers, mods, setMods) => {
    if (!comboItem) return null;
    const groups = (comboItem.modifiers || []).filter(g => {
      const lname = (g.name || '').toLowerCase();
      return !excludeMatchers.some(m => lname === m.toLowerCase());
    });
    if (groups.length === 0) return null;
    return (
      <div className="space-y-4">
        {groups.map(group => (
          <div key={group.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">{group.name}</h4>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {group.selection_type === 'MULTIPLE' ? 'Choose any' : 'Choose one'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.modifiers.map(mod => {
                const isMultiple = group.selection_type === 'MULTIPLE';
                const sel = mods[group.name];
                const isSelected = isMultiple
                  ? (sel || []).some(m => m.id === mod.id)
                  : sel?.id === mod.id;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    disabled={mod.sold_out}
                    onClick={() => setMods(prev => {
                      if (isMultiple) {
                        const cur = prev[group.name] || [];
                        return { ...prev, [group.name]: cur.find(m => m.id === mod.id) ? cur.filter(m => m.id !== mod.id) : [...cur, mod] };
                      }
                      return { ...prev, [group.name]: prev[group.name]?.id === mod.id ? null : mod };
                    })}
                    className={`px-4 py-2.5 rounded-full border transition-all font-body text-sm font-semibold ${
                      mod.sold_out
                        ? 'border-gray-200 bg-muted opacity-50 cursor-not-allowed text-muted-foreground'
                        : isSelected
                          ? 'border-midnight-cherry bg-midnight-cherry/5 text-midnight-cherry'
                          : 'border-gray-300 bg-white text-obsidian-roast hover:border-midnight-cherry/50'
                    }`}
                  >
                    {mod.name}
                    {mod.sold_out ? (
                      <span className="ml-1.5 text-xs text-muted-foreground uppercase">Sold Out</span>
                    ) : mod.price > 0 && (
                      <span className={`ml-1.5 text-xs ${isSelected ? 'text-midnight-cherry' : 'text-muted-foreground'}`}>+${mod.price.toFixed(2)}</span>
                    )}
                    {isSelected && <Check size={13} className="ml-1 inline" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Happy Hour badge */}
      {isHappyHour && (
        <div className="inline-flex items-center gap-1.5 bg-midnight-cherry text-white text-xs font-heading px-3 py-1 rounded-full">
          <Clock size={12} /> Happy Hour · Online
          {happyHourPrice !== null && (
            <span className="ml-1 line-through opacity-70">${item.price.toFixed(2)}</span>
          )}
        </div>
      )}

      {/* Deluxe label preview */}
      {deluxeLabel && (
        <div className="inline-flex items-center gap-1.5 bg-midnight-cherry/10 text-midnight-cherry text-xs font-heading px-3 py-1 rounded-full">
          <Sparkles size={12} />
          {deluxeLabel}
        </div>
      )}

      {/* Combo toggle — burgers only */}
      {isBurger && comboData && (
        <div className="space-y-2">
          <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">Make it a combo?</h4>
          <button
            type="button"
            onClick={() => { setIsCombo(false); setComboStep(0); }}
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
            onClick={() => { setIsCombo(true); setComboStep(0); }}
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
                  Pick a side + a 20oz drink or hand-spun shake
                </span>
              </div>
            </div>
            <div className="text-right">
              {comboAddOn > 0 && (
                <span className="text-sm font-semibold">+${comboAddOn.toFixed(2)}</span>
              )}
              <span className={`block text-xs ${isCombo ? 'text-white/80' : 'text-midnight-cherry'}`}>Unbeatable value</span>
            </div>
          </button>
        </div>
      )}

      {/* Deluxe presets */}
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

      {/* Modifier groups */}
      {hasModifiers ? (
        item.modifiers.map(group => (
          <div key={group.name}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">{group.name}</h4>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {group.selection_type === 'MULTIPLE' ? 'Choose any' : 'Choose one'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
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
                    className={`px-4 py-2.5 rounded-full border transition-all font-body text-sm font-semibold ${
                      mod.sold_out
                        ? 'border-gray-200 bg-muted opacity-50 cursor-not-allowed text-muted-foreground'
                        : isSelected
                          ? 'border-midnight-cherry bg-midnight-cherry/5 text-midnight-cherry'
                          : 'border-gray-300 bg-white text-obsidian-roast hover:border-midnight-cherry/50'
                    }`}
                  >
                    {mod.name}
                    {mod.sold_out ? (
                      <span className="ml-1.5 text-xs text-muted-foreground uppercase">Sold Out</span>
                    ) : mod.price > 0 && (
                      <span className={`ml-1.5 text-xs ${isSelected ? 'text-midnight-cherry' : 'text-muted-foreground'}`}>+${mod.price.toFixed(2)}</span>
                    )}
                    {isSelected && <Check size={13} className="ml-1 inline" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      ) : !isBurger && (
        <p className="text-sm text-muted-foreground text-center py-4">No customizations available.</p>
      )}

      {/* Combo steps — shown below the main modifiers */}
      {/* Step 0: "Pick a side" button */}
      {isBurger && comboData && isCombo && comboStep === 0 && (
        <button
          type="button"
          onClick={() => setComboStep(1)}
          className="w-full py-3 text-sm font-heading rounded-xl flex items-center justify-center gap-2 border-2 border-midnight-cherry bg-midnight-cherry/5 text-midnight-cherry hover:bg-midnight-cherry/10 transition-all"
        >
          <Sparkles size={16} />
          Pick a Side
        </button>
      )}

      {/* Step 1: Side list */}
      {isBurger && comboData && isCombo && comboStep === 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">Pick your side</h4>
            <button type="button" onClick={() => setComboStep(0)} className="text-xs text-muted-foreground hover:text-midnight-cherry">Back</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {comboData.sides.map(s => {
              const selected = comboSide?.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { setComboSide(s); setComboStep(2); }}
                  className={`px-4 py-2.5 rounded-full border transition-all font-body text-sm font-semibold ${
                    selected ? 'border-midnight-cherry bg-midnight-cherry/5 text-midnight-cherry' : 'border-gray-300 bg-white text-obsidian-roast hover:border-midnight-cherry/50'
                  }`}
                >
                  {s.name}
                  {selected && <Check size={13} className="ml-1 inline" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Side modifiers + "Pick your drink" button */}
      {isBurger && comboData && isCombo && comboStep === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Side:</span>
            <span className="font-heading text-sm text-midnight-cherry">{comboSide?.name}</span>
            <button type="button" onClick={() => setComboStep(1)} className="text-xs text-patina-mint hover:text-midnight-cherry underline">Change</button>
          </div>
          {comboSide && renderExtraGroups(comboSide, [], comboSideMods, setComboSideMods)}
          <button
            type="button"
            onClick={() => setComboStep(3)}
            className="w-full py-3 text-sm font-heading rounded-xl flex items-center justify-center gap-2 border-2 border-midnight-cherry bg-midnight-cherry/5 text-midnight-cherry hover:bg-midnight-cherry/10 transition-all"
          >
            <Sparkles size={16} />
            Pick Your Drink
          </button>
        </div>
      )}

      {/* Step 3: Drink type picker */}
      {isBurger && comboData && isCombo && comboStep === 3 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">Pick your drink</h4>
            <button type="button" onClick={() => setComboStep(2)} className="text-xs text-muted-foreground hover:text-midnight-cherry">Back</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setComboDrinkType('soda'); setComboFlavor(null); setComboStep(4); }}
              className={`px-3 py-2.5 rounded-xl border transition-all font-heading text-sm ${
                comboDrinkType === 'soda' ? 'border-midnight-cherry bg-midnight-cherry/5 text-midnight-cherry' : 'border-gray-300 bg-white text-obsidian-roast hover:border-midnight-cherry/50'
              }`}
            >
              Soft Drink (20oz)
            </button>
            <button
              type="button"
              onClick={() => { setComboDrinkType('shake'); setComboSoda(null); setComboStep(4); }}
              className={`px-3 py-2.5 rounded-xl border transition-all font-heading text-sm ${
                comboDrinkType === 'shake' ? 'border-midnight-cherry bg-midnight-cherry/5 text-midnight-cherry' : 'border-gray-300 bg-white text-obsidian-roast hover:border-midnight-cherry/50'
              }`}
            >
              Hand-Spun Shake
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Drink details — soda choices or shake flavors + add-ons */}
      {isBurger && comboData && isCombo && comboStep === 4 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Drink:</span>
            <span className="font-heading text-sm uppercase tracking-wider text-midnight-cherry">
              {comboDrinkType === 'shake' ? 'Hand-Spun Shake' : 'Soft Drink (20oz)'}
            </span>
            <button type="button" onClick={() => setComboStep(3)} className="text-xs text-patina-mint hover:text-midnight-cherry underline">Change</button>
          </div>

          {/* Soda choice list */}
          {comboDrinkType === 'soda' && sodaOpts.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">Choose your soda</h4>
              <div className="flex flex-wrap gap-2">
                {sodaOpts.map(opt => {
                  const selected = comboSoda?.id === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setComboSoda(opt)}
                      className={`px-4 py-2.5 rounded-full border transition-all font-body text-sm font-semibold ${
                        selected ? 'border-midnight-cherry bg-midnight-cherry/5 text-midnight-cherry' : 'border-gray-300 bg-white text-obsidian-roast hover:border-midnight-cherry/50'
                      }`}
                    >
                      {opt.name}
                      {selected && <Check size={13} className="ml-1 inline" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Shake flavor picker */}
          {comboDrinkType === 'shake' && shakeFlavorOpts.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">Pick your shake flavor</h4>
              <div className="flex flex-wrap gap-2">
                {shakeFlavorOpts.map(opt => {
                  const selected = comboFlavor?.id === opt.id;
                  const name = resolveFlavorName(opt.id, opt.name);
                  const emoji = resolveFlavorEmoji(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setComboFlavor(opt)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border transition-all font-body text-sm font-semibold ${
                        selected ? 'border-midnight-cherry bg-midnight-cherry/5 text-midnight-cherry' : 'border-gray-300 bg-white text-obsidian-roast hover:border-midnight-cherry/50'
                      }`}
                    >
                      <span className="text-base leading-none">{emoji}</span>
                      {name}
                      {opt.price > 0 && <span className={`text-xs ${selected ? 'text-red-200' : 'text-muted-foreground'}`}>+${opt.price.toFixed(2)}</span>}
                      {selected && <Check size={13} className="ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Shake extra modifiers — extra flavors, whipped cream, toppings, etc. */}
          {comboDrinkType === 'shake' && renderExtraGroups(comboData.shake, shakeExclude, comboShakeMods, setComboShakeMods)}

          {/* Drink extra modifiers — ice level, etc. */}
          {comboDrinkType === 'soda' && renderExtraGroups(comboData.drink, drinkExclude, comboDrinkMods, setComboDrinkMods)}
        </div>
      )}
    </div>
  );
});

export default ProductModifierPanel;