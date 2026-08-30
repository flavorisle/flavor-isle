// Modifier lines for the printed menu: cup/drink sizes with their real prices,
// soda choices, ice cream bases, and sundae/float toppings.
import React from 'react';

const money = n => `$${Number(n).toFixed(2)}`;

// Size groups get absolute prices (base + upcharge) so staff can read the cup
// price straight off the sheet. Every other group lists the upcharge instead.
function groupLine(group, basePrice) {
  const opts = group.modifiers || [];
  if (!opts.length) return null;
  const isSize = /size/i.test(group.name || '');

  const text = opts
    .map(m => {
      const up = Number(m.price) || 0;
      if (isSize) return `${m.name} ${money((Number(basePrice) || 0) + up)}`;
      return up > 0 ? `${m.name} +${money(up)}` : m.name;
    })
    .join(' · ');

  return { label: group.name, text };
}

export default function PrintItemModifiers({ item }) {
  const lines = (item.modifiers || [])
    .map(g => groupLine(g, item.price))
    .filter(Boolean);

  if (!lines.length) return null;

  return (
    <div className="mt-0.5 pl-2 border-l border-gray-300 space-y-0.5">
      {lines.map(line => (
        <p key={line.label} className="text-[9.5px] leading-tight text-gray-800">
          <span className="font-semibold uppercase">{line.label}:</span> {line.text}
        </p>
      ))}
    </div>
  );
}