import React from 'react';
import BuildCardModifierGroup from '@/components/admin/BuildCardModifierGroup';
import { squareMoney, splitCardGroups } from '@/lib/buildCardContent';

// The card body prints the shake's own groups (ingredients and topping) exactly
// as Square holds them. Base and thickness live in the page footer.
export default function SquareBuildCard({ card, height }) {
  const { card: groups } = splitCardGroups(card.modifier_groups);

  return (
    <article className="square-build-card force-light bg-card text-card-foreground border-secondary border-l-primary border-l-[12px] rounded-xl p-4"
      style={{ width: 1008, minHeight: 304, height: height ? height * 96 / 150 : 'auto', borderTopWidth: 2, borderRightWidth: 2, borderBottomWidth: 2 }}>
      <header className="flex items-start justify-between gap-4 mb-3">
        <h2 className="font-heading text-[40px] leading-none break-words">{card.name}</h2>
        <div className="shrink-0 font-heading text-[24px] leading-tight">
          {card.sizes.map(size => (
            <div key={size.id} className="flex justify-between gap-4">
              <span>{size.name}</span><span>{squareMoney(size.price_money)}</span>
            </div>
          ))}
        </div>
      </header>
      <div style={{ columns: 2, columnGap: 12 }}>
        {groups.map(group => <BuildCardModifierGroup key={group.key} group={group} />)}
      </div>
    </article>
  );
}