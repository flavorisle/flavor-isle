import React from 'react';
import { applyModifierOverrides, getModifierOverrides } from '@/lib/modifierOverrides';
import { ruleBadge } from '@/lib/modifierRules';
import { isFlavorGroup } from '@/components/FlavorPillButton';
import NestedModifierLists from '@/components/NestedModifierLists';
import FlavorAmountLegend from '@/components/FlavorAmountLegend';
import ClassicDrinkIceSize from '@/components/ClassicDrinkIceSize';
import ModifierTile from '@/components/ModifierTile';
import { getIceContext, iceLevelFor, ICE_LIST_ID } from '@/components/classicDrinkIce';
import { getModifierPhoto, refreshModifierPhotos } from '@/lib/modifierPhotos';
import { supportsLevels, levelFromNested, nestedForLevel } from '@/lib/modifierLevels';

// The product page's "What's on it" box: the item description followed by a
// tile for every option the item offers.
//
// Every tile comes from the item's own Square options (see MenuItem.modifiers +
// the admin overrides in MenuSetting), so the choices here can never drift from
// what the kitchen actually offers — nothing to maintain, no item left out.
//
// These tiles don't hold their own state: tapping one toggles the selection the
// ProductModifierPanel already owns, so the tiles, the price, and the cart
// always agree. Each tile carries the same Lite / Reg / Ex strip the customize
// sheet uses, and priced options show their upcharge.
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
  // Issue #324 — the same photo an option shows in the modifier modal rides on
  // its tile here, so a topping reads the same everywhere on the page.
  refreshModifierPhotos(menuSetting);
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

  // Only explain the Lite / Reg / Ex strip on items that actually show one.
  const hasLevelTiles = groups.some(
    (group) => isFlavorGroup(group) || group.modifiers.some((mod) => supportsLevels(mod)),
  );

  // A tile's strip lands on the same selection the panel and the cart use:
  // Reg selects the option, Lite/Extra record its own amount, and tapping the
  // active segment again takes the option back off.
  const setTileLevel = (group, mod, next) => {
    const isSelected = selected.has(mod.id);
    if (next == null) {
      if (isSelected) {
        onToggle?.(group.name, mod);
        onNestedChange?.(mod.id, {});
      }
      return;
    }
    if (!isSelected) onToggle?.(group.name, mod);
    const levelsHere = supportsLevels(mod) || isFlavorGroup(group);
    onNestedChange?.(mod.id, next === 'reg' || !levelsHere ? {} : nestedForLevel(mod, next));
  };

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
            Tap a tile to add it, tap it again to take it off. Anything with a price adds that much.
          </p>
          {hasLevelTiles && <FlavorAmountLegend align="left" className="mb-3" />}
          <div className="space-y-4">
            {groups.map((group) => {
              const rule = ruleBadge(group);
              return (
                <div key={group.id || group.name}>
                  <div className="flex items-baseline justify-between gap-2 mb-2">
                    <p className="font-heading text-sm text-obsidian-roast">{groupLabel(group.name)}</p>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex-shrink-0">
                      {rule}
                    </span>
                  </div>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 148px))', gap: '8px', justifyContent: 'center' }}>
                    {group.modifiers.map((mod) => {
                      const isSelected = selected.has(mod.id);

                      if (iceContext && group.name === iceContext.sizeGroup.name) {
                        return (
                          <ClassicDrinkIceSize
                            key={mod.id}
                            mod={mod}
                            selected={isSelected}
                            level={iceLevel}
                            onSelect={onIceSizeChange}
                          />
                        );
                      }

                      return (
                        <ModifierTile
                          key={mod.id}
                          name={mod.name}
                          price={mod.price}
                          photo={getModifierPhoto(mod.name)}
                          state={isSelected ? (levelFromNested(nestedSelections[mod.id]) || 'reg') : null}
                          onSelect={(next) => setTileLevel(group, mod, next)}
                        />
                      );
                    })}
                  </div>
                  {/* Follow-up choices for a picked option — a soda's ice level and
                      flavor, for instance. */}
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