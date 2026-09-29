import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Check, Sparkles, Clock } from 'lucide-react';
import { buildFullDeluxeLabel } from '@/lib/deluxeLabel';
import { useCart } from '@/context/CartContext';
import { isHappyHourItem, getHappyHourItemPrice, getHappyHourConfig } from '@/lib/happyHour';
import { isDeluxeEnabled, getDeluxePresetsForItem, isDeluxePresetActive, applyDeluxePreset } from '@/lib/deluxeConfig';
import { trackViewItem, foodItemToGa4 } from '@/lib/ga4Ecommerce';
import { flattenModifierWithNested, nestedSelectionsExtra } from './NestedModifierLists';
import { applyModifierOverrides } from '@/lib/modifierOverrides';
import { getIceContext, iceLevelFor, iceOption, withIceSelection, restoreDrinkSelections } from './classicDrinkIce';
import { isShakeItem } from './AllergyNote';
import ShakeFlavorControl from './ShakeFlavorControl';

// Inline modifier selection panel for the two-column ProductDetail page:
// modifiers, Deluxe presets, and Happy Hour pricing — rendered inline (no
// portal/modal wrapper) so the page can own the summary, quantity, combos
// (see ComboPicker), and the Add to Bag CTA.
// The parent drives confirm() and reads live state via onStateChange.
const ProductModifierPanel = forwardRef(function ProductModifierPanel(
  { item, onConfirm, onStateChange, initialCartItem },
  ref,
) {
  const { menuSetting } = useCart();

  // Admin modifier controls (Menu Manager → Modifiers) applied to the parent
  // groups and their nested child lists before anything renders or prices, so
  // this panel always matches what the admin set — hidden options are gone,
  // sold-out ones can't be picked, and overridden prices are shown and charged.
  const groups = applyModifierOverrides(item.modifiers, menuSetting?.modifier_overrides);
  const hasModifiers = groups.length > 0;
  const soldOut = item.is_available === false;

  // Initialize selections: SINGLE → null, MULTIPLE → []
  const initSelections = () => {
    if (!hasModifiers) return {};
    return groups.reduce((acc, group) => {
      acc[group.name] = group.selection_type === 'MULTIPLE'
        ? []
        : (group.name === 'Size' ? (group.modifiers.find(m => !m.sold_out) || group.modifiers[0]) : null);
      return acc;
    }, {});
  };

  const [selections, setSelections] = useState(() => initialCartItem ? restoreDrinkSelections(groups, initialCartItem).selections : initSelections());
  const [nestedSelections, setNestedSelections] = useState(() => initialCartItem ? restoreDrinkSelections(groups, initialCartItem).nested : {});
  const [coreLevel, setCoreLevel] = useState(initialCartItem?.flavorLevel || null);
  const iceContext = getIceContext(groups);
  const soda = iceContext && selections[iceContext.sodaGroup.name];
  const selectIceSize = (mod, level) => {
    setSelections(prev => ({ ...prev, [iceContext.sizeGroup.name]: mod }));
    const chosenSoda = soda || iceContext.sodaGroup.modifiers.find(m => !m.sold_out);
    if (chosenSoda && (soda || level !== 'regular') && iceOption(chosenSoda, level)) {
      if (!soda) setSelections(prev => ({ ...prev, [iceContext.sodaGroup.name]: chosenSoda }));
      setNestedSelections(prev => withIceSelection(prev, chosenSoda, level));
    }
  };

  const isHappyHour = isHappyHourItem(item, menuSetting);
  const happyHourPrice = isHappyHour ? getHappyHourItemPrice(item, menuSetting) : null;
  const hhConfig = isHappyHour ? getHappyHourConfig(menuSetting) : null;
  const hhPct = hhConfig ? (hhConfig.discount_percent || 0) / 100 : 0;

  const isBurger = /burger/i.test(item.name);

  useEffect(() => {
    trackViewItem(foodItemToGa4(item), { value: item.price });
  }, [item]);

  // Deluxe presets
  const deluxePresets = isDeluxeEnabled() ? getDeluxePresetsForItem(item) : [];

  const toggleDeluxe = (preset) => {
    setSelections((prev) => applyDeluxePreset(prev, preset, !isDeluxePresetActive(prev, preset)));
  };

  const toggleSingle = (groupName, mod) => {
    if (iceContext && groupName === iceContext.sodaGroup.name && soda?.id !== mod.id) {
      setNestedSelections(prev => withIceSelection(prev, mod, iceLevelFor(soda, prev)));
    }
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
      sel.forEach((m) => {
        liveModifiers.push(...flattenModifierWithNested(m, groupName, nestedSelections[m.id]).filter(x => !x.silent));
      });
    } else {
      liveModifiers.push(...flattenModifierWithNested(sel, groupName, nestedSelections[sel.id]).filter(x => !x.silent));
    }
  }
  const silentSets = deluxePresets.map(p => new Set((p.silentToppings || []).map(t => t.toLowerCase())));
  const labelPresets = deluxePresets.map((p, i) => {
    const trackedMods = (p.modifiers || []).filter(m => !silentSets[i].has((m.name || '').toLowerCase()));
    return {
      name: p.name,
      trackedToppings: trackedMods.map(m => m.name),
      allToppings: p.toppings,
      trackedModifierIds: trackedMods.map(m => m.id),
      allModifierIds: (p.modifiers || []).map(m => m.id),
    };
  });
  const { label: deluxeLabel, allToppings: deluxeAllToppings } = isDeluxeEnabled()
    ? buildFullDeluxeLabel(liveModifiers, labelPresets, item)
    : { label: null, allToppings: [] };

  // The full label (preset + "add" extras + "sub/add" cheese) is shown in the
  // combo summary, badge, and stored on the cart item for consistent display
  // across the cart, checkout, and email receipts.
  const burgerModsLabel = deluxeLabel;

  const nestedExtraCost = Object.values(nestedSelections).reduce((sum, nested) => sum + nestedSelectionsExtra(nested), 0);
  const extraCost = Object.values(selections).reduce((sum, sel) => {
    if (!sel) return sum;
    if (Array.isArray(sel)) return sum + sel.reduce((s, m) => s + (m.price || 0), 0);
    return sum + (sel.price || 0);
  }, 0) + nestedExtraCost;

  const itemTotal = isHappyHour ? (item.price + extraCost) * (1 - hhPct) : item.price + extraCost;
  const ready = !soldOut;

  // Notify parent of live state so the left-column CTA can reflect it.
  // The selected option ids and nested Lite/Extra levels are reported too, so
  // the product page's "What's on it" chips render the same selection this
  // panel holds (and the same one pricing and checkout read).
  const selectedModIds = Object.values(selections).flatMap((sel) =>
    sel ? (Array.isArray(sel) ? sel.map((m) => m.id) : [sel.id]) : []);
  const selectedIdKey = selectedModIds.join(',');

  useEffect(() => {
    onStateChange?.({
      total: itemTotal,
      extraCost,
      deluxeLabel,
      burgerModsLabel,
      ready,
      selectedIds: selectedIdKey ? selectedIdKey.split(',') : [],
      nestedSelections,
    });
  }, [itemTotal, extraCost, deluxeLabel, burgerModsLabel, ready, selectedIdKey, nestedSelections, onStateChange]);

  // The customer's configuration for this item. Used by confirm(), and — when a
  // combo is being built — by the product page, which needs the burger's own
  // modifiers to price it as a combo component without adding it twice.
  const buildSelection = () => {
    const selectedMods = [];
    for (const [groupName, sel] of Object.entries(selections)) {
      if (!sel) continue;
      if (Array.isArray(sel)) {
        sel.forEach(m => {
          selectedMods.push(...flattenModifierWithNested(m, groupName, nestedSelections[m.id]));
        });
      } else {
        selectedMods.push(...flattenModifierWithNested(sel, groupName, nestedSelections[sel.id]));
      }
    }
    const { label, allToppings } = isDeluxeEnabled()
      ? buildFullDeluxeLabel(selectedMods.filter(m => !m.silent), labelPresets, item)
      : { label: null, allToppings: [] };
    return { selectedMods, label, allToppings };
  };

  const handleConfirm = () => {
    const { selectedMods, label, allToppings } = buildSelection();
    onConfirm(selectedMods, extraCost, label, allToppings, coreLevel);
  };

  useImperativeHandle(ref, () => ({
    confirm: handleConfirm,
    isReady: () => ready,
    getSelection: () => buildSelection(),
    // Driven by the product page's "What's on it" chips: they toggle this
    // panel's own selection rather than keeping a parallel copy.
    toggleModifier: (groupName, mod) => {
      if (!mod || mod.sold_out) return;
      const group = groups.find((g) => g.name === groupName);
      if (!group) return;
      if (group.selection_type === 'MULTIPLE') toggleMultiple(groupName, mod);
      else toggleSingle(groupName, mod);
    },
    setNested: (modId, nested) => setNestedSelections((prev) => ({ ...prev, [modId]: nested })),
    selectIceSize,
  }));

  return (
    <div className="space-y-6">
      {isShakeItem(item) && <ShakeFlavorControl item={item} level={coreLevel} onChange={setCoreLevel} />}
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

      {/* The item's options are picked on the "What's on it" chips — this panel
          owns that selection, the Deluxe preset, and the add-to-bag flow. */}
      {!hasModifiers && !isBurger && (
        <p className="text-sm text-muted-foreground text-center py-4">No customizations available.</p>
      )}

    </div>
  );
});

export default ProductModifierPanel;