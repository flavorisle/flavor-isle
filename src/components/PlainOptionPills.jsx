import React from 'react';
import { isPillOption } from '@/lib/plainOption';

// Issue #324 — removal options ("No cheese", "No topping", "No sauce",
// "Plain") and the shake thickness group ("Thick, Thin, or Regular Thickness")
// are pills, not tiles: one compact chip each, wrapping in a row, so they never
// take a photo-sized cell away from the toppings that actually go on the item.
// Tapping a pill selects it; tapping it again clears it, the same way a tile
// behaves.
//
// Controlled component: isSelected(mod) and onToggle(mod) are the caller's.
const FONT = 'Arial, Helvetica, sans-serif';

export default function PlainOptionPills({ options = [], groupName, isSelected, onToggle }) {
  const pills = (options || []).filter((mod) => isPillOption(mod.name, groupName));
  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {pills.map((mod) => {
        const on = !!isSelected?.(mod);
        const hasPrice = Number(mod.price) > 0;
        return (
          <button
            key={mod.id}
            type="button"
            disabled={mod.sold_out}
            onClick={() => onToggle?.(mod)}
            aria-pressed={on}
            style={{
              minHeight: 38,
              padding: '0 14px',
              borderRadius: 999,
              border: `2px solid ${on ? '#CC3300' : '#cfc9b8'}`,
              background: on ? '#CC3300' : '#ffffff',
              color: on ? '#ffffff' : '#003366',
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: 10.5,
              letterSpacing: '.04em',
              textTransform: 'uppercase',
              cursor: mod.sold_out ? 'not-allowed' : 'pointer',
              opacity: mod.sold_out ? 0.55 : 1,
            }}
          >
            {mod.name}
            {hasPrice && ' '}
            {hasPrice && (
              <span style={{ color: on ? '#ffffff' : '#CC3300', fontWeight: 800 }}>
                +${Number(mod.price).toFixed(2)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}