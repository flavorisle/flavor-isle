import React from 'react';
import BuildCardModifierGroup from '@/components/admin/BuildCardModifierGroup';
import { squareMoney } from '@/lib/buildCardContent';

export default function SquareBuildCard({ card, height }) {
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
      <div style={{ columns: 3, columnGap: 12 }}>
        {card.modifier_groups.map(group => <BuildCardModifierGroup key={group.key} group={group} />)}
      </div>
    </article>
  );
}