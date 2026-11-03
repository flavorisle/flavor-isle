import React from 'react';
import { squareMoney } from '@/lib/buildCardContent';

// Square marks add-ons by naming them "Optional: ...". They stay in their own
// group, printed under an Optional heading with their Square price.
const isOptional = (option) => /^\s*optional\b/i.test(option.name);
const optionLabel = (option) => option.name.replace(/^\s*optional\s*[:\-–]?\s*/i, '');

function OptionLine({ option }) {
  return (
    <li data-square-modifier-id={option.id} className="text-[20px] leading-tight break-words">
      <span className="whitespace-pre-wrap">{optionLabel(option)}</span>
      {option.price_money && <span className="font-bold text-primary"> {squareMoney(option.price_money)}</span>}
      {(option.on_by_default || option.sold_out || option.hidden_online) && (
        <span className="text-[14px] text-muted-foreground"> ({[
          option.on_by_default && 'default', option.sold_out && 'sold out', option.hidden_online && 'hidden online',
        ].filter(Boolean).join(', ')})</span>
      )}
      {option.child_modifier_lists.map(child => <BuildCardModifierGroup key={child.key} group={child} />)}
    </li>
  );
}

export default function BuildCardModifierGroup({ group }) {
  const standard = group.modifiers.filter(option => !isOptional(option));
  const optional = group.modifiers.filter(isOptional);

  return (
    <section className="build-card-modifier-group border border-border rounded-lg bg-background p-2 mb-2"
      style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
      <h3 className="font-heading text-[21px] leading-tight break-words text-secondary">{group.name}</h3>
      {standard.length > 0 && <ul className="list-disc pl-4 mt-1 space-y-1">{standard.map(option => <OptionLine key={option.key} option={option} />)}</ul>}
      {optional.length > 0 && (
        <div className="mt-1">
          <p className="text-[14px] font-bold uppercase tracking-wide text-primary">Optional</p>
          <ul className="list-disc pl-4 space-y-1">{optional.map(option => <OptionLine key={option.key} option={option} />)}</ul>
        </div>
      )}
      {group.modifier_type === 'TEXT' && <p className="text-[16px]">Text modifier</p>}
    </section>
  );
}