import React from 'react';
import { Check } from 'lucide-react';
import { applyModifierOverrides, getModifierOverrides } from '@/lib/modifierOverrides';
import { getFlavorLevel } from '@/components/FlavorPillButton';

// The live recap of what will be on the item, shown right above Add to Bag.
//
// The page's "What's on it" box is the chooser (every chip the item offers);
// this is the receipt for the choices actually made, so the customer can see
// the finished build — Lite / Extra levels and any follow-up picks included —
// before the item goes in the bag. It reads the same selection the chips, the
// price, and the cart use, so it can never disagree with them.
export default function ItemSelectionSummary({ item, menuSetting, selectedIds = [], nestedSelections = {} }) {
  const groups = applyModifierOverrides(item?.modifiers, getModifierOverrides(menuSetting))
    .map((group) => ({
      ...group,
      modifiers: (group.modifiers || []).filter((opt) => (opt.name || '').trim() && !opt.sold_out),
    }))
    .filter((group) => group.modifiers.length > 0);

  const selected = new Set(selectedIds);
  const picks = groups.flatMap((group) =>
    group.modifiers
      .filter((mod) => selected.has(mod.id))
      .map((mod) => {
        const nested = nestedSelections[mod.id] || {};
        const level = getFlavorLevel(nested);
        // Anything nested that isn't the Lite/Extra level itself — a soda's
        // ice or flavor, say — is called out beside the option it came from.
        const extras = Object.values(nested)
          .map((entry) => String(entry?.name || '').trim())
          .filter((name) => name && !/^(lite|light|regular|extra)$/i.test(name));
        const label = `${level === 'lite' ? 'Lite ' : level === 'extra' ? 'Extra ' : ''}${mod.name}`;
        return { id: mod.id, label, extras };
      }),
  );

  if (groups.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-3 sm:p-4">
      <p className="font-heading text-sm uppercase tracking-widest text-obsidian-roast mb-2">
        What's going on it
      </p>
      {picks.length > 0 ? (
        <ul className="space-y-1">
          {picks.map((pick) => (
            <li key={pick.id} className="flex gap-1.5 text-sm text-obsidian-roast">
              <Check size={13} className="text-midnight-cherry flex-shrink-0 mt-1" />
              <span>
                {pick.label}
                {pick.extras.length > 0 && <span className="text-muted-foreground"> · {pick.extras.join(', ')}</span>}
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