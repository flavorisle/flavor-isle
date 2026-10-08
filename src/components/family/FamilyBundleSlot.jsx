import React, { useState } from 'react';
import { Pencil, Check } from 'lucide-react';
import ModifierModal from '@/components/ModifierModal';
import { FAMILY_BUNDLE } from '@/config/familyBundle';
import { allowedOptionIdsForGroup, rulesForSlot, presetForSlot, buildSlotState, summarizeModifiers } from '@/lib/familyBundle';

// One slot on The School Night Lifesaver card. Item slots (cheeseburger, mini,
// drink, cake) open that item's real modifier flow; side slots first pick one of
// the four approved sides, then the seasoning list. Every flow is trimmed to
// what the bundle offers and starts with the bundle's approved defaults.
export default function FamilyBundleSlot({ slot, item, sides, state, modifierOverrides, onConfigured, disabled }) {
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const isSide = slot.kind === 'side';
  const activeItem = isSide
    ? (sides || []).find((s) => s.id === state.itemId) || (sides || [])[0]
    : item;

  const rules = rulesForSlot(slot);
  const optionFilter = (group, mod) => {
    const allowed = allowedOptionIdsForGroup(group, rules);
    return allowed === null || allowed.includes(mod.id);
  };

  const confirm = (selectedMods, extraCost) => {
    onConfigured({
      itemId: activeItem?.id,
      selectedModifiers: selectedMods,
      extraCost,
      summary: summarizeModifiers(selectedMods),
    });
    setOpen(false);
  };

  const pickSide = (sideItem) => {
    // Choose the side and immediately take its seasoning defaults, then open the
    // flow on that side so Regular / SEASON WITH CAJUN can be adjusted.
    onConfigured({ itemId: sideItem.id, ...buildSlotState(slot, sideItem, modifierOverrides) });
    setPickerOpen(false);
    setOpen(true);
  };

  const title = isSide && activeItem ? `${slot.label} — ${activeItem.name}` : slot.label;

  return (
    <div className="py-2.5 border-b border-border last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-heading text-sm text-obsidian-roast truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {state.summary}
            {state.extraCost > 0 ? ` · +$${state.extraCost.toFixed(2)}` : ''}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || !activeItem}
          onClick={() => (isSide ? setPickerOpen((v) => !v) : setOpen(true))}
          className="tap-44 flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-heading bg-muted text-obsidian-roast hover:bg-midnight-cherry hover:text-white transition-colors disabled:opacity-50"
        >
          {isSide && pickerOpen ? <Check size={13} /> : <Pencil size={13} />}
          {isSide ? (pickerOpen ? 'Close' : 'Choose') : 'Customize'}
        </button>
      </div>

      {isSide && pickerOpen && (
        <div className="flex flex-wrap gap-2 mt-2">
          {(sides || []).map((sideItem) => (
            <button
              key={sideItem.id}
              type="button"
              onClick={() => pickSide(sideItem)}
              className={`px-3 py-2 rounded-full text-xs font-heading transition-colors ${
                state.itemId === sideItem.id ? 'bg-midnight-cherry text-white' : 'bg-muted text-obsidian-roast hover:bg-gray-200'
              }`}
            >
              {sideItem.name} · ${sideItem.price.toFixed(2)}
            </button>
          ))}
        </div>
      )}

      {open && activeItem && (
        <ModifierModal
          item={activeItem}
          optionFilter={optionFilter}
          preset={presetForSlot(slot)}
          confirmLabel="Add to bundle"
          onClose={() => setOpen(false)}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}