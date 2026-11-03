import React from 'react';
import { squareMoney } from '@/lib/buildCardContent';

export default function BuildCardModifierGroup({ group }) {
  return (
    <section className="build-card-modifier-group border border-border rounded-lg bg-background p-2 mb-2"
      style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <h3 className="font-heading text-[21px] leading-tight break-words text-secondary">{group.name}</h3>
      <ul className="list-disc pl-4 mt-1 space-y-1">
        {group.modifiers.map(option => (
          <li key={option.key} data-square-modifier-id={option.id} className="text-[20px] leading-tight break-words">
            <span className="whitespace-pre-wrap">{option.name}</span>
            {option.price_money && <span className="font-bold text-primary"> {squareMoney(option.price_money)}</span>}
            {(option.on_by_default || option.sold_out || option.hidden_online) && (
              <span className="text-[14px] text-muted-foreground"> ({[
                option.on_by_default && 'default', option.sold_out && 'sold out', option.hidden_online && 'hidden online',
              ].filter(Boolean).join(', ')})</span>
            )}
            {option.child_modifier_lists.map(child => <BuildCardModifierGroup key={child.key} group={child} />)}
          </li>
        ))}
      </ul>
      {group.modifier_type === 'TEXT' && <p className="text-[16px]">Text modifier</p>}
    </section>
  );
}