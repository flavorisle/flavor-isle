import React from 'react';
import { Minus, Plus, Check } from 'lucide-react';

const norm = (s) => (s || '').toString().toLowerCase().trim();
const PREFERENCE_WORDS = new Set(['lite', 'light', 'regular', 'normal', 'extra']);

// Finds the preference-type child list (Lite/Regular/Extra) on a modifier.
// Returns the child list object, or null if the modifier has no preference list.
export function getPreferenceList(mod) {
  const lists = mod?.child_modifier_lists || [];
  for (const list of lists) {
    const names = (list.modifiers || []).map(m => norm(m.name));
    if (names.length > 0 && names.every(n => PREFERENCE_WORDS.has(n))) {
      return list;
    }
  }
  return null;
}

function getPreferenceOptions(list) {
  const opts = { lite: null, regular: null, extra: null };
  for (const m of (list?.modifiers || [])) {
    const n = norm(m.name);
    if (n === 'lite' || n === 'light') opts.lite = m;
    else if (n === 'regular' || n === 'normal') opts.regular = m;
    else if (n === 'extra') opts.extra = m;
  }
  return opts;
}

// A modifier pill with integrated Lite (left) / Regular (center) / Extra (right)
// zones. Replaces the separate nested preference pills with a compact 3-zone
// pill so the customer doesn't see a confusing standalone "Extra" entry below.
//
// Left zone = Lite (− icon, "Lite" on hover/hold)
// Center    = Regular (modifier name, tap toggles selection)
// Right zone = Extra (+ icon, "Extra" on hover/hold)
//
// On desktop, hovering over a side zone reveals the word. On mobile, the − / +
// icons are always visible and pressing (active) reveals the word.
export default function PreferencePillButton({
  mod,
  isSelected,
  onToggle,
  nestedSelection,
  onNestedChange,
}) {
  const prefList = getPreferenceList(mod);
  if (!prefList) return null;

  const { lite, regular, extra } = getPreferenceOptions(prefList);
  const currentPref = nestedSelection?.[prefList.name];
  const prefName = currentPref ? norm(currentPref.name) : null;
  const isLite = prefName === 'lite' || prefName === 'light';
  const isExtra = prefName === 'extra';
  const isRegular = isSelected && !isLite && !isExtra;

  const label = mod.name;
  const totalPrice = (mod.price || 0) + (currentPref?.price || 0);

  const handleLite = () => {
    if (!lite) return;
    if (!isSelected) onToggle();
    onNestedChange({ [prefList.name]: lite });
  };

  const handleExtra = () => {
    if (!extra) return;
    if (!isSelected) onToggle();
    onNestedChange({ [prefList.name]: extra });
  };

  const handleCenter = () => {
    // The name toggles the parent, even when a Lite/Extra child is selected.
    onToggle();
    onNestedChange({});
  };

  return (
    <div className={`inline-flex items-stretch rounded-full border-2 overflow-hidden transition-all font-body text-sm font-semibold ${
      isSelected
        ? 'border-midnight-cherry bg-midnight-cherry/5'
        : 'border-gray-300 bg-white hover:border-midnight-cherry/50'
    }`}>
      {lite && (
        <button
          type="button"
          onClick={handleLite}
          aria-label={`Lite ${mod.name}`}
          className={`group/lite flex items-center justify-center px-3 transition-colors ${
            isLite
              ? 'bg-midnight-cherry text-white'
              : 'text-midnight-cherry hover:bg-midnight-cherry/10 active:bg-midnight-cherry/15'
          }`}
        >
          <Minus size={14} className="group-hover/lite:hidden group-active/lite:hidden" />
          <span className="hidden group-hover/lite:inline group-active/lite:inline text-xs font-heading uppercase tracking-wide">Lite</span>
        </button>
      )}

      <button
        type="button"
        onClick={handleCenter}
        className={`flex items-center gap-1.5 px-4 py-2.5 transition-colors ${
          isRegular ? 'text-midnight-cherry' : isSelected ? 'text-midnight-cherry' : 'text-obsidian-roast'
        }`}
      >
        {isSelected && <Check size={13} className="inline flex-shrink-0" />}
        <span>{label}</span>
        {totalPrice > 0 && (
          <span className={`text-xs ${isSelected ? 'text-midnight-cherry' : 'text-muted-foreground'}`}>
            +${totalPrice.toFixed(2)}
          </span>
        )}
      </button>

      {extra && (
        <button
          type="button"
          onClick={handleExtra}
          aria-label={`Extra ${mod.name}`}
          className={`group/extra flex items-center justify-center px-3 transition-colors ${
            isExtra
              ? 'bg-midnight-cherry text-white'
              : 'text-midnight-cherry hover:bg-midnight-cherry/10 active:bg-midnight-cherry/15'
          }`}
        >
          <Plus size={14} className="group-hover/extra:hidden group-active/extra:hidden" />
          <span className="hidden group-hover/extra:inline group-active/extra:inline text-xs font-heading uppercase tracking-wide">Extra</span>
        </button>
      )}
    </div>
  );
}