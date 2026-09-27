import React from 'react';
import { applyModifierOverrides, getModifierOverrides } from '@/lib/modifierOverrides';

// What's-on-it summary for a product page, built from the item's own options.
//
// Every chip comes from the Square modifier data already attached to the item
// (see MenuItem.modifiers + the admin overrides in MenuSetting), so the summary
// can never drift from what the kitchen actually offers: no extra copy to
// maintain, no item left without a summary. Options at no extra charge read as
// included; priced ones show the upcharge. Sold-out options are left out.
//
// Square group names are often long instructions shouted in all caps
// ("WHICH TOPPINGS WOULD YOU LIKE ON YOUR MINI BURGER? YOUR CHOICES ARE: …") —
// they're trimmed to the question and softened to sentence case for display.
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

export default function ItemBuildSummary({ item, menuSetting }) {
  const groups = applyModifierOverrides(item?.modifiers, getModifierOverrides(menuSetting))
    .map((group) => ({
      ...group,
      modifiers: (group.modifiers || []).filter((opt) => (opt.name || '').trim() && !opt.sold_out),
    }))
    .filter((group) => group.modifiers.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="card-diner p-4 sm:p-5">
      <h2 className="font-heading text-lg text-obsidian-roast mb-1">What's on it</h2>
      <p className="text-xs text-muted-foreground mb-3">
        Everything this item comes with, and anything you can add.
      </p>
      <div className="space-y-3">
        {groups.map((group) => (
          <div key={group.id || group.name}>
            <div className="flex items-baseline justify-between gap-2 mb-1.5">
              <p className="font-heading text-sm text-obsidian-roast">{groupLabel(group.name)}</p>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex-shrink-0">
                {group.selection_type === 'SINGLE' ? 'Pick one' : 'Pick any'}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {group.modifiers.map((opt) => {
                const extra = Number(opt.price) > 0;
                return (
                  <span
                    key={opt.id || opt.name}
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      extra ? 'bg-smashie-yellow/25 text-obsidian-roast' : 'bg-patina-mint/10 text-patina-mint'
                    }`}
                  >
                    {opt.name}
                    {extra && <span className="ml-1 font-body font-bold">+${Number(opt.price).toFixed(2)}</span>}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}