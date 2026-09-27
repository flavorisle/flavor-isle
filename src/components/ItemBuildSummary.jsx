import React from 'react';
import { Check, Plus } from 'lucide-react';
import { applyModifierOverrides, getModifierOverrides } from '@/lib/modifierOverrides';
import PreferencePillButton, { getPreferenceList } from '@/components/PreferencePillButton';

// Selectable "What's on it" chips for a product page.
//
// Every chip comes from the item's own Square options (see MenuItem.modifiers +
// the admin overrides in MenuSetting), so the choices here can never drift from
// what the kitchen actually offers — nothing to maintain, no item left out.
//
// These chips don't hold their own state: tapping one toggles the selection the
// ProductModifierPanel already owns, so the chips, the customization list below,
// the price, and the cart always agree. Sauces and toppings keep their Lite /
// Extra zones (the − / + pill), and priced options show their upcharge.
//
// Square group names are often long instructions shouted in all caps
// ("WHICH TOPPINGS WOULD YOU LIKE ON YOUR BURGER? YOU CAN CHOOSE") — they're
// trimmed to the question and softened to sentence case for display.
function groupLabel(name) {
  const raw = String(name || '').trim();
  let label = raw.split(/[:?]/)[0].trim().replace(/\.$/, '');
  if (label.length < 3) label = raw;
  if (label.length > 58) label = `${label.slice(0, 55).trimEnd()}…`;
  if (label === label.toUpperCase()) {
    label = label.toLowerCase().replace(/(^|[\s(/])([a-z])/g, (_, pre, ch) => pre + ch.toUpperCase());
  }
  return label;
}

export default function ItemBuildSummary({
  item,
  menuSetting,
  selectedIds = [],
  nestedSelections = {},
  onToggle,
  onNestedChange,
}) {
  const groups = applyModifierOverrides(item?.modifiers, getModifierOverrides(menuSetting))
    .map((group) => ({
      ...group,
      modifiers: (group.modifiers || []).filter((opt) => (opt.name || '').trim() && !opt.sold_out),
    }))
    .filter((group) => group.modifiers.length > 0);

  if (groups.length === 0) return null;

  const selected = new Set(selectedIds);

  return (
    <div className="card-diner p-4 sm:p-5">
      <h2 className="font-heading text-lg text-obsidian-roast mb-1">What's on it</h2>
      <p className="text-xs text-muted-foreground mb-3">
        Tap a chip to add it, tap it again to take it off. On sauces and toppings,
        − and + make it Lite or Extra. Anything with a price adds that much.
      </p>
      <div className="space-y-4">
        {groups.map((group) => {
          const multiple = group.selection_type === 'MULTIPLE';
          return (
            <div key={group.id || group.name}>
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <p className="font-heading text-sm text-obsidian-roast">{groupLabel(group.name)}</p>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex-shrink-0">
                  {multiple ? 'Pick any' : 'Pick one'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {group.modifiers.map((mod) => {
                  const isSelected = selected.has(mod.id);

                  // Sauces and toppings carry Lite / Regular / Extra zones —
                  // reuse the same pill the customization list uses so those
                  // options stay available right on the chip.
                  if (getPreferenceList(mod)) {
                    return (
                      <PreferencePillButton
                        key={mod.id}
                        mod={mod}
                        isSelected={isSelected}
                        onToggle={() => onToggle?.(group.name, mod)}
                        nestedSelection={nestedSelections[mod.id] || {}}
                        onNestedChange={(nested) => onNestedChange?.(mod.id, nested)}
                      />
                    );
                  }

                  const extra = Number(mod.price) > 0;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => onToggle?.(group.name, mod)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border-2 font-body text-sm font-semibold transition-all ${
                        isSelected
                          ? 'border-midnight-cherry bg-midnight-cherry/10 text-midnight-cherry'
                          : 'border-gray-300 bg-white text-obsidian-roast hover:border-midnight-cherry/50'
                      }`}
                    >
                      {isSelected ? (
                        <Check size={13} className="flex-shrink-0" />
                      ) : (
                        <Plus size={13} className="text-midnight-cherry flex-shrink-0" />
                      )}
                      <span>{mod.name}</span>
                      {extra && (
                        <span className={`text-xs ${isSelected ? 'text-midnight-cherry' : 'text-muted-foreground'}`}>
                          +${Number(mod.price).toFixed(2)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}