import React, { useState } from 'react';
import { X } from 'lucide-react';

// Category chips with an inline picker: the chosen Square categories are shown as
// removable chips, and "+ category" opens a searchable multi-select of every
// category present in the synced MenuItem rows.
export default function CategoryChips({ label, hint, categories, options, onChange, addLabel = '+ category' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const list = categories || [];
  const q = query.trim().toLowerCase();
  const shown = (options || []).filter((o) => !q || o.toLowerCase().includes(q));

  const add = (category) => { if (!list.includes(category)) onChange([...list, category]); };
  const remove = (category) => onChange(list.filter((c) => c !== category));

  return (
    <div>
      {label && <p className="text-[11px] font-heading uppercase tracking-widest text-obsidian-roast mb-1">{label}</p>}
      {hint && <p className="text-[11px] text-muted-foreground mb-2">{hint}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        {list.length === 0 && <span className="text-[11px] text-muted-foreground italic">Inherits the shared categories</span>}
        {list.map((category) => (
          <span key={category} className="inline-flex items-center gap-1 text-[11px] bg-muted px-2 py-1 rounded-full">
            {category}
            <button
              onClick={() => remove(category)}
              aria-label={`Remove ${category}`}
              className="text-muted-foreground hover:text-midnight-cherry"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] font-heading px-2 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:border-midnight-cherry/50"
        >
          {addLabel}
        </button>
      </div>

      {open && (
        <div className="mt-2 border border-border rounded-xl bg-white p-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories"
            className="w-full rounded-lg border border-border px-2 py-1.5 text-xs mb-2"
          />
          <div className="max-h-40 overflow-y-auto space-y-0.5">
            {shown.length === 0 && (
              <p className="text-[11px] text-muted-foreground italic px-1 py-1">No category matches.</p>
            )}
            {shown.map((category) => {
              const on = list.includes(category);
              return (
                <button
                  key={category}
                  onClick={() => (on ? remove(category) : add(category))}
                  className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-[11px] text-left ${
                    on ? 'bg-midnight-cherry/10 text-midnight-cherry font-semibold' : 'hover:bg-muted'
                  }`}
                >
                  <span className="truncate">{category}</span>
                  <span>{on ? '✓' : ''}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}