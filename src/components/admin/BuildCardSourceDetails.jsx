import React from 'react';
import BuildCardModifierGroup from '@/components/admin/BuildCardModifierGroup';
import { squareMoney } from '@/lib/buildCardContent';

export default function BuildCardSourceDetails({ card, setOverride }) {
  return (
    <section className="card-diner p-5">
      <h3 className="font-heading text-xl">{card.name}</h3>
      <p className="text-sm text-muted-foreground mb-3">{card.modifier_groups.length} attached groups · {card.modifier_count} modifiers</p>
      <p className="text-sm mb-4">Exact Square names and prices. Disabled groups are included and marked, not treated as part of the active recipe.</p>
      <div className="text-sm mb-4 space-y-1">
        {card.sizes.map(size => <p key={size.id}>{size.name} {squareMoney(size.price_money)}</p>)}
      </div>
      {card.modifier_groups.map(group => <BuildCardModifierGroup key={group.key} group={group} />)}
      <label className="flex items-center gap-2 min-h-11 text-sm mt-3 cursor-pointer">
        <input type="checkbox" checked={card.on_sheet !== false} onChange={event => setOverride(card.key, 'off_sheet', event.target.checked ? undefined : true)} />
        Include this card on the sheet
      </label>
    </section>
  );
}