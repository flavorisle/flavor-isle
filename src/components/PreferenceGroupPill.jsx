import React from 'react';
import { Check } from 'lucide-react';

const norm = (s) => (s || '').toString().trim().toLowerCase();
const LIGHT_RE = /^(lite|light)\b/i;
const REGULAR_RE = /^(regular|normal)\b/i;
const EXTRA_RE = /^extra\b/i;

// The shared noun behind a level option: "Light Milk (thick)" → "milk",
// "Regular Milk" → "milk", "Extra Milk (thin)" → "milk".
const baseNoun = (name) => norm(name).replace(/^(lite|light|regular|normal|extra)\b/, '').replace(/\(.*?\)/g, '').trim();

// A choice group that is really one thing at three levels — a Light / Regular /
// Extra triple sharing the same noun. The milkshake "Thick, Thin, or Regular
// Thickness" group (Light Milk / Regular Milk / Extra Milk) is the one that
// ships today. Those three options fold into the same − / Regular / + pill the
// burger sauces and toppings use, so the customer gets one compact control
// instead of three separate buttons.
//
// Requires all three levels AND the same noun on each, so unrelated options
// (a soda's standing "Light Ice" / "Extra Ice" pair, a lone "Extra Cheese")
// keep their normal buttons. Returns null when the group isn't a triplet, and
// callers render their ordinary buttons in that case.
export function getPreferenceTriplet(group) {
  if (!group || group.selection_type === 'MULTIPLE') return null;
  const opts = group.modifiers || [];
  const light = opts.find((m) => LIGHT_RE.test(norm(m.name)));
  const regular = opts.find((m) => REGULAR_RE.test(norm(m.name)));
  const extra = opts.find((m) => EXTRA_RE.test(norm(m.name)));
  if (!light || !regular || !extra) return null;
  const noun = baseNoun(regular.name);
  if (!noun || baseNoun(light.name) !== noun || baseNoun(extra.name) !== noun) return null;
  return { light, regular, extra };
}

// Left zone = Lite, center = the chosen level, right zone = Extra — the same
// three-zone pill the burger sauces use, with the word always visible on the
// two filled side zones.
export default function PreferenceGroupPill({ group, selectedId, onSelect }) {
  const triplet = getPreferenceTriplet(group);
  if (!triplet) return null;

  const { light, regular, extra } = triplet;
  const isLight = selectedId === light.id;
  const isExtra = selectedId === extra.id;
  const isRegular = selectedId === regular.id;
  const isSelected = isLight || isRegular || isExtra;
  const current = isLight ? light : isExtra ? extra : regular;

  // Picking a level never clears the choice — a shake always has a thickness,
  // so tapping the level that's already chosen is a no-op instead of a deselect.
  const pick = (mod) => {
    if (mod.id !== selectedId) onSelect?.(mod);
  };

  return (
    <div className={`inline-flex items-stretch rounded-full border-2 overflow-hidden transition-all font-body text-sm font-semibold ${
      isSelected
        ? 'border-midnight-cherry bg-midnight-cherry/5'
        : 'border-gray-300 bg-white hover:border-midnight-cherry/50'
    }`}>
      <button
        type="button"
        onClick={() => pick(light)}
        aria-label={`Lite — ${light.name}`}
        className={`flex items-center justify-center px-3 transition-colors ${
          isLight
            ? 'bg-midnight-cherry text-white'
            : 'bg-midnight-cherry/10 text-midnight-cherry hover:bg-midnight-cherry/20 active:bg-midnight-cherry/25'
        }`}
      >
        <span className="text-xs font-heading uppercase tracking-wide">Lite</span>
      </button>

      <button
        type="button"
        onClick={() => pick(regular)}
        className={`flex items-center gap-1.5 px-4 py-2.5 transition-colors ${
          isSelected ? 'text-midnight-cherry' : 'text-obsidian-roast'
        }`}
      >
        {isSelected && <Check size={13} className="inline flex-shrink-0" />}
        <span>{current.name}</span>
        {current.price > 0 && (
          <span className={`text-xs ${isSelected ? 'text-midnight-cherry' : 'text-muted-foreground'}`}>
            +${current.price.toFixed(2)}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => pick(extra)}
        aria-label={`Extra — ${extra.name}`}
        className={`flex items-center justify-center px-3 transition-colors ${
          isExtra
            ? 'bg-midnight-cherry text-white'
            : 'bg-midnight-cherry/10 text-midnight-cherry hover:bg-midnight-cherry/20 active:bg-midnight-cherry/25'
        }`}
      >
        <span className="text-xs font-heading uppercase tracking-wide">Extra</span>
      </button>
    </div>
  );
}