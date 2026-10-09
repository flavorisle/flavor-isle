import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Per-shake allergy flag — the same idea as the allergy checkbox at checkout,
// but it rides on the individual shake line instead of the whole order. What the
// customer types here travels with that one shake all the way to the kitchen
// ticket, POS line, and receipt, so the crew knows exactly which shake is
// allergic and how.
export default function ShakeAllergyCheckbox({ checked, note, onChange, error }) {
  return (
    <div className={`rounded-xl border-2 px-3 py-2.5 ${checked ? 'border-midnight-cherry bg-midnight-cherry/5' : 'border-border bg-white'}`}>
      <label className="flex items-start gap-2.5 cursor-pointer min-h-[44px]">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange({ flag: e.target.checked, note: e.target.checked ? note : '' })}
          className="mt-1 w-5 h-5 flex-shrink-0 accent-[var(--midnight-cherry)]"
        />
        <span className="flex items-start gap-1.5 text-sm text-obsidian-roast leading-relaxed">
          <AlertTriangle size={14} className="text-midnight-cherry mt-0.5 flex-shrink-0" />
          This shake has a food allergy
        </span>
      </label>

      {checked && (
        <div className="mt-2 pl-0.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Tell us what the allergy is *
          </label>
          <textarea
            value={note}
            onChange={(e) => onChange({ flag: true, note: e.target.value })}
            placeholder="e.g. Severe peanut allergy…"
            rows={2}
            className="w-full px-3 py-2.5 bg-white border border-border rounded-xl text-sm text-obsidian-roast placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
          />
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
}