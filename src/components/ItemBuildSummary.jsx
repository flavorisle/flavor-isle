import React from 'react';
import { Check, Plus } from 'lucide-react';
import { applyModifierOverrides, getModifierOverrides } from '@/lib/modifierOverrides';
import PreferencePillButton, { getPreferenceList } from '@/components/PreferencePillButton';
import PreferenceGroupPill, { getPreferenceTriplet } from '@/components/PreferenceGroupPill';
import FlavorPillButton, { isFlavorGroup } from '@/components/FlavorPillButton';
import NestedModifierLists from '@/components/NestedModifierLists';
import FlavorAmountLegend from '@/components/FlavorAmountLegend';
import ClassicDrinkIceSize from '@/components/ClassicDrinkIceSize';
import { getIceContext, iceLevelFor, ICE_LIST_ID } from '@/components/classicDrinkIce';

// The product page's "What's on it" box: the item description followed by
// selectable chips for every option the item offers.
//
// Every chip comes from the item's own Square options (see MenuItem.modifiers +
// the admin overrides in MenuSetting), so the choices here can never drift from
// what the kitchen actually offers — nothing to maintain, no item left out.
//
// These chips don't hold their own state: tapping one toggles the selection the
// ProductModifierPanel already owns, so the chips, the price, and the cart
// always agree. Sauces and toppings keep their Lite / Extra zones (the
// Lite / Extra pill), and priced options show their upcharge.
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
  description,
  selectedIds = [],
  nestedSelections = {},
  onToggle,
  onNestedChange,
  onIceSizeChange,
}) {
  const groups = applyModifierOverrides(item?.modifiers, getModifierOverrides(menuSetting))
    .map((group) => ({
      ...group,
      modifiers: (group.modifiers || []).filter((opt) => (opt.name || '').trim() && !opt.sold_out),
    }))
    .filter((group) => group.modifiers.length > 0);

  const hasGroups = groups.length > 0;
  if (!hasGroups && !description) return null;

  const selected = new Set(selectedIds);
  const iceContext = getIceContext(groups);
  const soda = iceContext?.sodaGroup.modifiers.find(mod => selected.has(mod.id));
  const iceLevel = iceLevelFor(soda, nestedSelections);

  // Only explain the − / + zones on items that actually show one of those
  // pills — a plain topping list has no such control.
  const hasAmountPills = groups.some(
    (group) =>
      isFlavorGroup(group) ||
      getPreferenceTriplet(group) ||
      group.modifiers.some((mod) => getPreferenceList(mod)),
  );

  return (
    <div className="card-diner p-4 sm:p-5">
      {description && (
        <p className={`text-base leading-relaxed text-muted-foreground ${hasGroups ? 'pb-4 mb-4 border-b border-border' : ''}`}>
          {description}
        </p>
      )}

      {hasGroups && (
        <>
          <h2 className="font-heading text-lg text-obsidian-roast mb-1">What's on it</h2>
          <p className="text-xs text-muted-foreground mb-2">
            Tap a chip to add it, tap it again to take it off. Anything with a price adds that much.
          </p>
          {/* Same − / + legend the Shake Isle shows, so the zones on these chips
              are spelled out here too. */}
          {hasAmountPills && <FlavorAmountLegend align="left" className="mb-3" />}
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
                  {/* Plain option chips read as before; the wider Lite/Extra
                      pills sit two to a line on phones. */}
                  <div className="flex flex-wrap gap-2">
                    {getPreferenceTriplet(group) ? (
                      <PreferenceGroupPill
                        group={group}
                        selectedId={group.modifiers.find((m) => selected.has(m.id))?.id}
                        onSelect={(mod) => onToggle?.(group.name, mod)}
                      />
                    ) : group.modifiers.map((mod) => {
                      const isSelected = selected.has(mod.id);

                      // Sauces and toppings carry Lite / Regular / Extra zones —
                      // reuse the same pill the customization list uses so those
                      // options stay available right on the chip.
                      if (iceContext && group.name === iceContext.sizeGroup.name) {
                        return <ClassicDrinkIceSize key={mod.id} mod={mod} selected={isSelected} level={iceLevel} onSelect={onIceSizeChange} />;
                      }
                      // Shake flavors carry the same Lite / Extra pill as the
                      // sauces. Checked BEFORE the preference
                      // check so a flavor that carries Square's own "- / + Flavors"
                      // child list still renders (and prices) as the flavor pill —
                      // matching the customization modal exactly.
                      if (isFlavorGroup(group)) {
                        return (
                          <FlavorPillButton
                            key={mod.id}
                            mod={mod}
                            isSelected={isSelected}
                            onToggle={() => onToggle?.(group.name, mod)}
                            nestedSelection={nestedSelections[mod.id] || {}}
                            onNestedChange={(nested) => onNestedChange?.(mod.id, nested)}
                          />
                        );
                      }

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
                  {/* Follow-up choices for a picked option — a soda's ice level and
                      flavor, for instance. Lite/Extra levels stay on the pill. */}
                  {group.modifiers
                    .filter((mod) => selected.has(mod.id) && mod.child_modifier_lists?.length > 0)
                    .map((mod) => (
                      <NestedModifierLists
                        key={`nested-${mod.id}`}
                        parentMod={mod}
                        nestedSelections={nestedSelections[mod.id] || {}}
                        hiddenListId={iceContext && group.name === iceContext.sodaGroup.name ? ICE_LIST_ID : undefined}
                        onChange={(nested) => onNestedChange?.(mod.id, nested)}
                      />
                    ))}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}