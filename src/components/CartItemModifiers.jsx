import React from 'react';

// Renders the chosen modifiers for a cart/checkout line with their prices.
export default function CartItemModifiers({ modifiers }) {
  if (!modifiers || modifiers.length === 0) return null;
  return (
    <ul className="text-xs text-patina-mint space-y-0.5 mb-1">
      {modifiers.map((m, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <span className="text-patina-mint opacity-50">+</span>
          <span className="leading-snug">
            {m.name}
            {m.price > 0 && (
              <span className="ml-1 opacity-70">+${m.price.toFixed(2)}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}