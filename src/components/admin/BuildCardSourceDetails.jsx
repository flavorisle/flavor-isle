import React from 'react';
import BuildCardModifierGroup from '@/components/admin/BuildCardModifierGroup';
import { squareMoney, splitCardGroups } from '@/lib/buildCardContent';

export default function BuildCardSourceDetails({ card, setOverride }) {
  const { card: groups, footer } = splitCardGroups(card.modifier_groups);

  return (
    <section className="card-diner p-5">
      <h3 className="font-heading text-xl">{card.name}</h3>
      <p className="text-sm text-muted-foreground mb-3">
        {groups.length} card groups · {card.modifier_count} modifiers
      </p>
      <p className="text-sm mb-4">
        Exact Square names and prices. Active groups only — base and thickness print in the page footer.
      </p>
      <div className="text-sm mb-4 space-y-1">
        {card.sizes.map(size => <p key={size.id}>{size.name} {squareMoney(size.price_money)}</p>)}
      </div>
      {groups.map(group => <BuildCardModifierGroup key={group.key} group={group} />)}
      {footer.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold mb-2">Page footer · every Bliss</p>
          {footer.map(group => <BuildCardModifierGroup key={group.key} group={group} />)}
        </div>
      )}
      <label className="flex items-center gap-2 min-h-11 text-sm mt-3 cursor-pointer">
        <input type="checkbox" checked={card.on_sheet !== false} onChange={event => setOverride(card.key, 'off_sheet', event.target.checked ? undefined : true)} />
        Include this card on the sheet
      </label>
    </section>
  );
}