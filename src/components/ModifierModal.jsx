import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Check, Sparkles, Clock } from 'lucide-react';
import { buildDeluxeLabelFull } from '@/lib/deluxeLabel';
import { useCart } from '@/context/CartContext';
import { isHappyHourItem, getHappyHourItemPrice, getHappyHourConfig } from '@/lib/happyHour';
import { resolveFlavorName, resolveFlavorEmoji } from '@/lib/shakeConfig';
import { getComboData } from '@/lib/comboData';
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
  const [comboData, setComboData] = useState(null);
  const [comboSide, setComboSide] = useState(null);
  const [comboDrinkType, setComboDrinkType] = useState('shake');
  const [comboFlavor, setComboFlavor] = useState(null);
  const [comboSoda, setComboSoda] = useState(null);
  const [comboSideMods, setComboSideMods] = useState({});
  const [comboShakeMods, setComboShakeMods] = useState({});
  const [comboDrinkMods, setComboDrinkMods] = useState({});

  const { menuSetting } = useCart();

  // Happy Hour pricing — eligible items show a struck-through base price and
  // discounted total so the modal matches what the cart will actually charge.
  const isHappyHour = isHappyHourItem(item, menuSetting);
  const happyHourPrice = isHappyHour ? getHappyHourItemPrice(item, menuSetting) : null;
  const hhConfig = isHappyHour ? getHappyHourConfig(menuSetting) : null;
  const hhPct = hhConfig ? (hhConfig.discount_percent || 0) / 100 : 0;

  // Combo toggle — only for burger items. Uses a shared session cache so the
  // menu is fetched once (not on every modal open) — this keeps the "Make it an
  // Isle Combo" option from disappearing under API rate limits after the first
  // combo is added, so customers can build multiple combos in one order.
  const isBurger = /burger/i.test(item.name);
  useEffect(() => {
    if (!isBurger) return;
    let cancelled = false;
    getComboData().then(data => {
      if (cancelled || !data) return;
      setComboData(data);
      setComboSide(data.sides[0]);
    });
    return () => { cancelled = true; };
  }, [isBurger]);

  // Initialize side modifier selections whenever the chosen side changes.
  // SINGLE groups default to the first available option (like Size in the main
  // modal) so the side is always addable; MULTIPLE groups start empty.
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

  const COMBO_DISCOUNT = 1.50;

  // Combo component modifier groups — each handled by a dedicated picker, so
  // excluded from the generic "extra modifiers" UI. Matched by EXACT group name
  // (case-insensitive) so a shake "Extra Flavors" group still shows up alongside
  // the base flavor picker — a substring "flavor" match would wrongly hide it.
  // The base flavor group is the one whose name has "flavor" but not "extra".
  const shakeFlavorGroup = comboData
    ? (comboData.shake.modifiers || []).find(g => {
        const lname = (g.name || '').toLowerCase();
        return lname.includes('flavor') && !lname.includes('extra');
      })
    : null;
  const shakeFlavorOpts = (shakeFlavorGroup?.modifiers || []).filter(m => !m.sold_out);
  const shakeExclude = shakeFlavorGroup ? [shakeFlavorGroup.name] : [];

  const drinkSodaGroup = comboData ? (comboData.drink.modifiers || []).find(g => /soda choice/i.test(g.name || '')) : null;
  const sodaOpts = (drinkSodaGroup?.modifiers || []).filter(m => !m.sold_out);

  const drinkSizeGroup = comboData ? (comboData.drink.modifiers || []).find(g => /size/i.test(g.name || '')) : null;
  const drink20ozPrice = comboData ? (() => {
    const oz20 = (drinkSizeGroup?.modifiers || []).find(m => /20oz/i.test(m.name));
    return +(comboData.drink.price + (oz20?.price || 0)).toFixed(2);
  })() : 0;
  const drinkExclude = [drinkSodaGroup?.name, drinkSizeGroup?.name].filter(Boolean);

  // Initialize shake + drink "extra" modifier selections (every group not
  // already handled by a dedicated picker). SINGLE groups default to the first
  // available option; MULTIPLE groups start empty.
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
  // Shared helpers — the combo side, shake, and drink each carry their own
  // modifier groups; these flatten the per-item selections into a price delta
  // and a cart-ready list so the combo total and Square sync stay accurate.
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
  const sideModsExtra = modsExtra(comboSideMods);
  const sideModsToCart = modsToCart(comboSideMods);
  const shakeModsExtra = modsExtra(comboShakeMods);
  const shakeModsToCart = modsToCart(comboShakeMods);
  const drinkModsExtra = modsExtra(comboDrinkMods);
  const drinkModsToCart = modsToCart(comboDrinkMods);
  const comboAddOn = comboData && comboSide
    ? (comboDrinkType === 'shake'
        ? +(comboSide.price + sideModsExtra + comboData.shake.price + flavorExtra + shakeModsExtra - COMBO_DISCOUNT).toFixed(2)
        : +(comboSide.price + sideModsExtra + drink20ozPrice + drinkModsExtra - COMBO_DISCOUNT).toFixed(2))
    : 0;

  const comboReady = !!(comboData && comboSide && (comboDrinkType === 'shake' ? comboFlavor : comboSoda));

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
    const drinkSizeGroup = (comboData?.drink?.modifiers || []).find(g => /size/i.test(g.name || ''));
    const drink20ozMod = (drinkSizeGroup?.modifiers || []).find(m => /20oz/i.test(m.name));
    const comboItems = isCombo && comboData && comboSide && (comboDrinkType === 'shake' ? comboFlavor : comboSoda)
      ? (comboDrinkType === 'shake'
        ? [
            { ...comboSide, id: `combo-${comboSide.id}`, price: +(comboSide.price + sideModsExtra).toFixed(2), quantity: 1, selectedModifiers: sideModsToCart },
            {
              ...comboData.shake,
              id: `combo-${comboData.shake.id}`,
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
            { ...comboSide, id: `combo-${comboSide.id}`, price: +(comboSide.price + sideModsExtra).toFixed(2), quantity: 1, selectedModifiers: sideModsToCart },
            {
              ...comboData.drink,
              id: `combo-${comboData.drink.id}`,
              name: `${comboSoda.name} (20oz)`,
              price: +(drink20ozPrice + drinkModsExtra - COMBO_DISCOUNT).toFixed(2),
              quantity: 1,
              selectedModifiers: [
                { id: comboSoda.id, name: comboSoda.name, price: comboSoda.price },
                ...(drink20ozMod ? [{ id: drink20ozMod.id, name: drink20ozMod.name, price: drink20ozMod.price }] : []),
                ...drinkModsToCart,
              ],
            },
          ])
      : [];
    onConfirm(selectedMods, extraCost, label, allToppings, comboItems);
  };

  // Renders a combo item's "extra" modifier groups — every group not already
  // handled by a dedicated picker. Reused for the side, shake, and drink so
  // each combo component is customizable the same way.
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
            <div className="space-y-2">
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
                    className={`w-full min-h-[44px] flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                      mod.sold_out
                        ? 'border-border bg-muted opacity-50 cursor-not-allowed'
                        : isSelected
                          ? 'border-midnight-cherry bg-red-50'
                          : 'border-border hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-all ${isSelected ? 'bg-midnight-cherry border-midnight-cherry' : 'border-gray-300'}`}>
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
        ))}
      </div>
    );
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
          {isBurger && comboData && (
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
                      Pick a side + a 20oz drink or hand-spun shake
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold">+${comboAddOn.toFixed(2)}</span>
                  <span className={`block text-xs ${isCombo ? 'text-white/80' : 'text-midnight-cherry'}`}>Unbeatable value</span>
                </div>
              </button>
            </div>
          )}

          {/* Side picker — shown when combo is selected */}
          {isBurger && comboData && isCombo && (
            <div className="space-y-2">
              <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">Pick your side</h4>
              <div className="flex flex-wrap gap-2">
                {comboData.sides.map(s => {
                  const selected = comboSide?.id === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setComboSide(s)}
                      className={`px-3 py-2.5 rounded-2xl border-2 transition-all font-body text-sm font-semibold ${
                        selected ? 'border-midnight-cherry bg-midnight-cherry text-white' : 'border-border bg-white text-obsidian-roast hover:border-midnight-cherry/50'
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

          {/* Side modifiers — seasoning, size, etc. for the chosen side */}
          {isBurger && comboData && isCombo && comboSide && renderExtraGroups(comboSide, [], comboSideMods, setComboSideMods)}

          {/* Drink type picker — shown when combo is selected */}
          {isBurger && comboData && isCombo && (
            <div className="space-y-2">
              <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">Pick your drink</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setComboDrinkType('soda'); setComboFlavor(null); }}
                  className={`px-3 py-2.5 rounded-2xl border-2 transition-all font-heading text-sm ${
                    comboDrinkType === 'soda' ? 'border-midnight-cherry bg-midnight-cherry text-white' : 'border-border bg-white text-obsidian-roast hover:border-midnight-cherry/50'
                  }`}
                >
                  Soft Drink (20oz)
                </button>
                <button
                  type="button"
                  onClick={() => { setComboDrinkType('shake'); setComboSoda(null); }}
                  className={`px-3 py-2.5 rounded-2xl border-2 transition-all font-heading text-sm ${
                    comboDrinkType === 'shake' ? 'border-midnight-cherry bg-midnight-cherry text-white' : 'border-border bg-white text-obsidian-roast hover:border-midnight-cherry/50'
                  }`}
                >
                  Hand-Spun Shake
                </button>
              </div>
            </div>
          )}

          {/* Soda choice list — shown when combo + soft drink selected */}
          {isBurger && comboData && isCombo && comboDrinkType === 'soda' && sodaOpts.length > 0 && (
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
                      className={`px-3 py-2.5 rounded-2xl border-2 transition-all font-body text-sm font-semibold ${
                        selected ? 'border-midnight-cherry bg-midnight-cherry text-white' : 'border-border bg-white text-obsidian-roast hover:border-midnight-cherry/50'
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

          {/* Shake flavor picker — shown when combo + shake selected */}
          {isBurger && comboData && isCombo && comboDrinkType === 'shake' && shakeFlavorOpts.length > 0 && (
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
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 transition-all font-body text-sm font-semibold ${
                        selected ? 'border-midnight-cherry bg-midnight-cherry text-white' : 'border-border bg-white text-obsidian-roast hover:border-midnight-cherry/50'
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

          {/* Shake extra modifiers — extra flavors, whipped cream, toppings, etc. (base flavor is picked above) */}
          {isBurger && comboData && isCombo && comboDrinkType === 'shake' && renderExtraGroups(comboData.shake, shakeExclude, comboShakeMods, setComboShakeMods)}

          {/* Drink extra modifiers — ice level, etc. (soda + 20oz size are picked above) */}
          {isBurger && comboData && isCombo && comboDrinkType === 'soda' && renderExtraGroups(comboData.drink, drinkExclude, comboDrinkMods, setComboDrinkMods)}

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
            disabled={isCombo && !comboReady}
            className={`btn-cherry chrome-hover w-full py-4 font-heading text-sm flex items-center justify-center gap-2 ${isCombo && !comboReady ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Plus size={16} />
            {isCombo && !comboReady ? `Pick a ${comboDrinkType === 'shake' ? 'shake flavor' : 'soda'}` : `Add to Order — $${footerTotal.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}