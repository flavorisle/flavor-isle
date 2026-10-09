import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Check, Sparkles, Clock } from 'lucide-react';
import { buildFullDeluxeLabel } from '@/lib/deluxeLabel';
import { useCart } from '@/context/CartContext';
import { isHappyHourItem, getHappyHourItemPrice, getHappyHourConfig } from '@/lib/happyHour';
import { isDeluxeEnabled, getDeluxePresetsForItem, isDeluxePresetActive, applyDeluxePreset } from '@/lib/deluxeConfig';
import { trackViewItem, foodItemToGa4 } from '@/lib/ga4Ecommerce';
import ShareItemButton from './ShareItemButton';
import NestedModifierLists, { flattenModifierWithNested, nestedSelectionsExtra } from './NestedModifierLists';
import PreferencePillButton, { getPreferenceList } from './PreferencePillButton';
import PreferenceGroupPill, { getPreferenceTriplet } from './PreferenceGroupPill';
import FlavorPillButton, { isFlavorGroup } from './FlavorPillButton';
import AllergyNote, { isShakeItem } from './AllergyNote';
import ShakeAllergyCheckbox from './ShakeAllergyCheckbox';
import FlavorAmountLegend from './FlavorAmountLegend';
import ShakeFlavorControl from './ShakeFlavorControl';
import { applyModifierOverrides } from '@/lib/modifierOverrides';
import ClassicDrinkIceSize from './ClassicDrinkIceSize';
import { getIceContext, iceLevelFor, iceOption, withIceSelection, ICE_LIST_ID } from './classicDrinkIce';

export default function ModifierModal({ item, onClose, onConfirm, autoCombo, optionFilter, preset, confirmLabel }) {
  const { menuSetting } = useCart();

  // Admin modifier controls (Menu Manager → Modifiers) applied to the parent
  // groups and their nested child lists before anything renders or prices, so
  // the modal always matches what the admin set — hidden options are gone,
  // sold-out ones can't be picked, and overridden prices are shown and charged.
  const allGroups = applyModifierOverrides(item.modifiers, menuSetting?.modifier_overrides);
  // An optional optionFilter trims the groups to what a caller offers (used by
  // the family bundle, where some catalog options are not offered at all).
  const groups = optionFilter
    ? allGroups
      .map((group) => ({ ...group, modifiers: (group.modifiers || []).filter((mod) => optionFilter(group, mod)) }))
      .filter((group) => group.modifiers.length > 0)
    : allGroups;
  const hasModifiers = groups.length > 0;
  const soldOut = item.is_available === false;

  // Options a caller wants pre-selected (the bundle's approved defaults).
  const presetOptionIds = new Set(preset?.selectionIds || []);

  // Initialize selections: SINGLE → null, MULTIPLE → []
  const initSelections = () => {
    if (!hasModifiers) return {};
    const base = groups.reduce((acc, group) => {
      // Size groups default to the first option so every item carries a size.
      acc[group.name] = group.selection_type === 'MULTIPLE'
        ? []
        : (group.name === 'Size' ? (group.modifiers.find(m => !m.sold_out) || group.modifiers[0]) : null);
      return acc;
    }, {});
    if (presetOptionIds.size > 0) {
      for (const group of groups) {
        const presetOptions = (group.modifiers || []).filter(m => presetOptionIds.has(m.id) && !m.sold_out);
        if (presetOptions.length === 0) continue;
        base[group.name] = group.selection_type === 'MULTIPLE' ? presetOptions : presetOptions[0];
      }
    }
    return base;
  };

  // Nested selections a caller wants pre-selected, keyed by parent option id.
  const initNested = () => {
    const wanted = preset?.nested;
    if (!wanted) return {};
    const out = {};
    for (const group of groups) {
      for (const mod of (group.modifiers || [])) {
        const picks = wanted[mod.id];
        if (!picks) continue;
        const chosen = {};
        for (const [listName, optionId] of Object.entries(picks)) {
          const list = (mod.child_modifier_lists || []).find(l => l.name === listName);
          const option = list?.modifiers?.find(m => m.id === optionId && !m.sold_out);
          if (option) chosen[listName] = option;
        }
        if (Object.keys(chosen).length > 0) out[mod.id] = chosen;
      }
    }
    return out;
  };

  const [selections, setSelections] = useState(initSelections);
  const [nestedSelections, setNestedSelections] = useState(initNested);
  const iceContext = getIceContext(groups);
  const soda = iceContext && selections[iceContext.sodaGroup.name];
  const iceLevel = iceLevelFor(soda, nestedSelections);
  const selectIceSize = (mod, level) => {
    setSelections(prev => ({ ...prev, [iceContext.sizeGroup.name]: mod }));
    const chosenSoda = soda || iceContext.sodaGroup.modifiers.find(m => !m.sold_out);
    if (chosenSoda && (soda || level !== 'regular') && iceOption(chosenSoda, level)) {
      if (!soda) setSelections(prev => ({ ...prev, [iceContext.sodaGroup.name]: chosenSoda }));
      setNestedSelections(prev => withIceSelection(prev, chosenSoda, level));
    }
  };

  // Milkshakes only: the customer can flag that THIS shake has an allergy and
  // say what it is. The note rides on the shake's own cart line so the kitchen
  // ticket names the shake that's allergic rather than the whole order.
  const shakeItem = isShakeItem(item);
  const [coreLevel, setCoreLevel] = useState(null);
  const [allergy, setAllergy] = useState({ flag: false, note: '' });
  const [allergyError, setAllergyError] = useState('');

  // Happy Hour pricing — eligible items show a struck-through base price and
  // discounted total so the modal matches what the cart will actually charge.
  const isHappyHour = isHappyHourItem(item, menuSetting);
  const happyHourPrice = isHappyHour ? getHappyHourItemPrice(item, menuSetting) : null;
  const hhConfig = isHappyHour ? getHappyHourConfig(menuSetting) : null;
  const hhPct = hhConfig ? (hhConfig.discount_percent || 0) / 100 : 0;

  useEffect(() => {
    trackViewItem(foodItemToGa4(item), { value: item.price });
  }, [item]);

  // Deluxe presets — one-tap shortcuts that each select a fixed set of toppings.
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
      // Size is required — tapping the selected size keeps it instead of clearing it.
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
        return { ...prev, [groupName]: [mod] };
      }
      const filtered = current.filter(m => !/plain/i.test(m.name) && !/no\s*sauce/i.test(m.name));
      return { ...prev, [groupName]: [...filtered, mod] };
    });
  };

  // Flatten the current selections into the same shape used by the cart so the
  // Deluxe label can update live as the customer toggles toppings.
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

  const nestedExtraCost = Object.values(selections).flatMap(sel => sel ? (Array.isArray(sel) ? sel : [sel]) : [])
    .reduce((sum, mod) => sum + nestedSelectionsExtra(nestedSelections[mod.id]), 0);
  const extraCost = Object.values(selections).reduce((sum, sel) => {
    if (!sel) return sum;
    if (Array.isArray(sel)) return sum + sel.reduce((s, m) => s + (m.price || 0), 0);
    return sum + (sel.price || 0);
  }, 0) + nestedExtraCost;

  // Total shown in the footer — reflects the Happy Hour discount so it matches
  // what the cart will actually charge.
  const itemTotal = isHappyHour ? (item.price + extraCost) * (1 - hhPct) : item.price + extraCost;
  const footerTotal = itemTotal;

  const handleConfirm = () => {
    // Flagged allergy with no explanation — the kitchen would get the alert with
    // nothing to act on, so ask for the details first.
    if (shakeItem && allergy.flag && !allergy.note.trim()) {
      setAllergyError('Tell us what the allergy is.');
      return;
    }
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
    onConfirm(selectedMods, extraCost, label, allToppings, [], shakeItem && allergy.flag ? allergy.note.trim() : '', coreLevel);
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
          <div className="flex items-center gap-2 flex-shrink-0">
            <ShareItemButton itemId={item.id} variant="pill" ariaLabel={`Share ${item.name}`} />
            <button onClick={onClose} className="tap-44 flex items-center justify-center hover:bg-muted rounded-full transition-colors flex-shrink-0">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modifier Groups */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 space-y-6">
          {shakeItem && <ShakeFlavorControl item={item} level={coreLevel} onChange={setCoreLevel} />}
          {/* Flavor pills show − / + zones — say what they do whenever any
              flavor group is on screen. */}
          {groups.some(isFlavorGroup) && <FlavorAmountLegend align="left" />}
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
            groups.map(group => (
              <div key={group.name}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">{group.name}</h4>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {group.selection_type === 'MULTIPLE' ? 'Choose any' : 'Choose one'}
                  </span>
                </div>
                {getPreferenceTriplet(group) ? (
                  <PreferenceGroupPill
                    group={group}
                    selectedId={selections[group.name]?.id}
                    onSelect={(mod) => toggleSingle(group.name, mod)}
                  />
                ) : (
                <div className="space-y-2">
                  {group.modifiers.map(mod => {
                    const isMultiple = group.selection_type === 'MULTIPLE';
                    const isSelected = isMultiple
                      ? (selections[group.name] || []).some(m => m.id === mod.id)
                      : selections[group.name]?.id === mod.id;

                    if (iceContext && group.name === iceContext.sizeGroup.name) {
                      return <ClassicDrinkIceSize key={mod.id} mod={mod} selected={isSelected} level={iceLevel} onSelect={selectIceSize} />;
                    }

                    // Flavors get the same Lite / Extra pill the burgers use.
                    // Checked BEFORE the preference check
                    // so a flavor carrying Square's own "- / + Flavors" child list
                    // still renders (and prices) as the flavor pill — matching the
                    // product summary exactly.
                    if (!mod.sold_out && isFlavorGroup(group)) {
                      return (
                        <div key={mod.id} className="py-1">
                          <FlavorPillButton
                            mod={mod}
                            isSelected={isSelected}
                            onToggle={() => isMultiple ? toggleMultiple(group.name, mod) : toggleSingle(group.name, mod)}
                            nestedSelection={nestedSelections[mod.id] || {}}
                            onNestedChange={(newNested) => setNestedSelections(prev => ({ ...prev, [mod.id]: newNested }))}
                          />
                        </div>
                      );
                    }

                    if (!mod.sold_out && getPreferenceList(mod)) {
                      return (
                        <div key={mod.id} className="py-1">
                          <PreferencePillButton
                            mod={mod}
                            isSelected={isSelected}
                            onToggle={() => isMultiple ? toggleMultiple(group.name, mod) : toggleSingle(group.name, mod)}
                            nestedSelection={nestedSelections[mod.id] || {}}
                            onNestedChange={(newNested) => setNestedSelections(prev => ({ ...prev, [mod.id]: newNested }))}
                          />
                        </div>
                      );
                    }

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
                )}
                {/* Nested modifier lists for selected modifiers with children */}
                {group.modifiers.filter(mod => {
                  const isMultiple = group.selection_type === 'MULTIPLE';
                  const isSelected = isMultiple
                    ? (selections[group.name] || []).some(m => m.id === mod.id)
                    : selections[group.name]?.id === mod.id;
                  return isSelected && mod.child_modifier_lists?.length > 0;
                }).map(mod => (
                  <NestedModifierLists
                    key={mod.id}
                    parentMod={mod}
                    nestedSelections={nestedSelections[mod.id] || {}}
                    hiddenListId={iceContext && group.name === iceContext.sodaGroup.name ? ICE_LIST_ID : undefined}
                    onChange={(newNested) => setNestedSelections(prev => ({ ...prev, [mod.id]: newNested }))}
                  />
                ))}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No customizations available.</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex-shrink-0 bg-white safe-bottom">
          {/* Every milkshake carries the allergy note — and the customer can flag
              this particular shake — right above the add button. */}
          {shakeItem && (
            <div className="mb-3 space-y-2">
              <AllergyNote compact />
              <ShakeAllergyCheckbox
                checked={allergy.flag}
                note={allergy.note}
                error={allergyError}
                onChange={(next) => { setAllergy(next); setAllergyError(''); }}
              />
            </div>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={soldOut}
            className={`w-full py-4 font-heading text-sm flex items-center justify-center gap-2 ${
              soldOut ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'btn-cherry chrome-hover'
            }`}
          >
            <Plus size={16} />
            {soldOut ? 'Sold Out' : confirmLabel ? `${confirmLabel} · $${footerTotal.toFixed(2)}` : `Add to Order — $${footerTotal.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}