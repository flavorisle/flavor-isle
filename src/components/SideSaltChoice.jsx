import React from 'react';

// Sides are cooked unsalted (issue #300), so the answer has to reach the
// kitchen. The same two-button question is asked everywhere a fry or tot is
// added — the quick customize modal and the full product page — so both
// surfaces stay worded and styled identically.
export default function SideSaltChoice({ value, onChange }) {
  const btn = (choice, label) => (
    <button
      type="button"
      onClick={() => onChange(choice)}
      aria-pressed={value === choice}
      className={`py-3 rounded-xl border text-sm font-heading transition-colors ${
        value === choice
          ? 'bg-midnight-cherry text-white border-midnight-cherry'
          : 'bg-white text-obsidian-roast border-border hover:border-midnight-cherry/50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div>
      <p className="font-heading text-sm text-obsidian-roast mb-2">Salt on your sides?</p>
      <div className="grid grid-cols-2 gap-2">
        {btn('yes', 'Yes, salt packets')}
        {btn('no', 'No salt')}
      </div>
    </div>
  );
}