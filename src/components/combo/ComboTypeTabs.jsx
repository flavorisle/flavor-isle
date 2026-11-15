import React from 'react';

// The named combo types across the top of the builder (Burgers, Chicken,
// Sandwiches). One pill per enabled type in the order the admin saved, scrolling
// sideways on a phone instead of wrapping into cramped rows.
export default function ComboTypeTabs({ types, activeId, onSelect }) {
  if (!types || types.length === 0) return null;
  return (
    <div className="mb-6 -mx-1 overflow-x-auto scrollbar-hide">
      <div className="flex gap-2 px-1 min-w-max">
        {types.map((type) => {
          const active = type.id === activeId;
          return (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              aria-pressed={active}
              className={`whitespace-nowrap px-4 py-2 rounded-full font-heading text-sm tracking-wide transition-colors ${
                active
                  ? 'bg-midnight-cherry text-white border-2 border-midnight-cherry'
                  : 'bg-white text-obsidian-roast border-2 border-border hover:border-midnight-cherry/40'
              }`}
            >
              {type.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}