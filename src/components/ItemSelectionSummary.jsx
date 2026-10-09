import React from 'react';
import { Check } from 'lucide-react';
import { applyModifierOverrides, getModifierOverrides } from '@/lib/modifierOverrides';
import { flattenModifierWithNested } from '@/components/NestedModifierLists';

// The recap of the item's build, shown right above Add to Bag — the lines the
// bag will list, in the same words.
//
// The page's "What's on it" box is the chooser (every option the item offers);
// this is the receipt for the choices made. It runs the same flattening the
// modifier panel runs when the item goes in the bag, so a Lite/Extra level or a
// follow-up pick reads here exactly as it will in the bag ("Extra Pickle",
// "Coke · Light Ice"). Seeing the build before adding means a mistake gets
// fixed on this page instead of the line being deleted in the cart and redone.
export default function ItemSelectionSummary({ item, menuSetting, selectedIds = [], nestedSelections = {} }) {
  if (!item?.modifiers?.length) return null;

  const selected = new Set(selectedIds);
  const lines = applyModifierOverrides(item.modifiers, getModifierOverrides(menuSetting))
    .flatMap((group) =>
      (group.modifiers || [])
        .filter((mod) => selected.has(mod.id))
        .flatMap((mod) => flattenModifierWithNested(mod, group.name, nestedSelections[mod.id]))
        // Silent rows are Square's own bookkeeping and carry no name; the bag
        // hides them, so the recap does too.
        .filter((mod) => mod.name),
    );

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3 sm:p-4">
      <p className="font-heading text-sm uppercase tracking-widest text-obsidian-roast mb-2">
        What's going on it
      </p>
      {lines.length > 0 ? (
        <ul className="space-y-0.5">
          {lines.map((line, i) => (
            <li key={`${line.id || line.name}-${i}`} className="flex items-start gap-1.5 text-sm text-obsidian-roast">
              <Check size={13} className="text-midnight-cherry flex-shrink-0 mt-1" />
              <span className="leading-snug">
                {line.name}
                {line.price > 0 && <span className="ml-1 opacity-70">+${line.price.toFixed(2)}</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing added yet — it comes just as described.</p>
      )}
    </div>
  );
}