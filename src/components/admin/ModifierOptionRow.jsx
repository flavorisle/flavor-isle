import React, { useEffect, useState } from 'react';

// One modifier option in the admin Modifiers panel: hide it from customers,
// mark it sold out, or set a site price that overrides the Square price.
export default function ModifierOptionRow({ option, overrides, onToggleHidden, onToggleSoldOut, onSetPrice }) {
  const hidden = option.id ? overrides.hidden_options.includes(option.id) : false;
  const soldOut = option.id ? overrides.sold_out_options.includes(option.id) : false;
  const overridePrice = option.id ? overrides.option_prices[option.id] : undefined;
  const [draft, setDraft] = useState(overridePrice != null ? String(overridePrice) : '');

  useEffect(() => {
    setDraft(overridePrice != null ? String(overridePrice) : '');
  }, [overridePrice]);

  // Commit on blur/Enter. Typing the Square price back in clears the override
  // instead of storing a redundant one.
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === '') { onSetPrice(option.id, null); return; }
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value < 0) {
      setDraft(overridePrice != null ? String(overridePrice) : '');
      return;
    }
    onSetPrice(option.id, value === option.price ? null : value);
  };

  if (!option.id) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2">
        <span className="flex-1 min-w-[140px] text-sm text-muted-foreground">{option.name}</span>
        <span className="text-xs text-muted-foreground">No catalog id — cannot be controlled</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 ${hidden ? 'bg-muted/60 border-border' : 'bg-white border-border'}`}>
      <span className={`flex-1 min-w-[140px] text-sm ${hidden ? 'text-muted-foreground line-through' : 'text-obsidian-roast'}`}>
        {option.name}
      </span>

      <span className="text-xs text-muted-foreground whitespace-nowrap">Square ${option.price.toFixed(2)}</span>

      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
        <input
          type="number"
          min="0"
          step="0.25"
          value={draft}
          placeholder={option.price.toFixed(2)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          title="Site price for this option — overrides the Square price"
          className={`w-24 pl-6 pr-2 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 ${overridePrice != null ? 'bg-smashie-yellow/20 border-smashie-yellow font-semibold' : 'bg-white border-border'}`}
        />
      </div>
      {overridePrice != null && (
        <button
          onClick={() => { setDraft(''); onSetPrice(option.id, null); }}
          className="text-xs text-midnight-cherry underline whitespace-nowrap"
        >
          Reset
        </button>
      )}

      <button
        onClick={() => onToggleSoldOut(option.id)}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-heading transition-colors whitespace-nowrap ${soldOut ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
      >
        {soldOut ? 'Sold out' : 'Available'}
      </button>

      <button
        onClick={() => onToggleHidden(option.id)}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-heading transition-colors whitespace-nowrap ${hidden ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-muted text-muted-foreground hover:bg-gray-200'}`}
      >
        {hidden ? 'Hidden' : 'Shown'}
      </button>
    </div>
  );
}