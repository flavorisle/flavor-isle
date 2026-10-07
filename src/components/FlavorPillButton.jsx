import React from 'react';
import { Minus, Plus, Check } from 'lucide-react';
import { getPreferenceList } from './PreferencePillButton';

// Flavors in Square's flavor list carry a nested "- / + Flavors" child list
// (Lite / Regular / Extra, Extra is +$0.75). This pill gives every flavor
// button the same three zones the burger sauces use and records the level as
// the REAL nested selection (with its catalog id and price), so the Extra
// amount is charged and reaches Square. Only a flavor with no such child list
// (e.g. the shake's own core flavor) falls back to a synthetic, id-less level
// that just prefixes the name ("Extra Cookies and Cream").

export const FLAVOR_AMOUNT_LIST = 'Flavor Amount';

export function isFlavorGroup(group) {
  return /flavor/i.test(group?.name || '');
}

// The nested-selection shape ModifierModal / ProductModifierPanel already
// flatten and price. Deliberately no id: the level is a name prefix, never a
// catalog option, so it can't be sent to Square as a modifier of its own.
export function flavorAmountNested(level) {
  if (!level) return {};
  return { [FLAVOR_AMOUNT_LIST]: { name: level === 'lite' ? 'Lite' : 'Extra', price: 0 } };
}

// Nested selection for a level: the flavor's real child option when it has one.
export function flavorNestedFor(mod, level) {
  if (!level) return {};
  const list = getPreferenceList(mod);
  const want = level === 'lite' ? ['lite', 'light'] : ['extra'];
  const opt = (list?.modifiers || []).find((m) => want.includes((m.name || '').toLowerCase().trim()));
  if (list && opt) return { [list.name]: opt };
  return flavorAmountNested(level);
}

export function getFlavorLevel(nestedSelection) {
  for (const sel of Object.values(nestedSelection || {})) {
    const n = ((Array.isArray(sel) ? sel[0]?.name : sel?.name) || '').toLowerCase().trim();
    if (n === 'lite' || n === 'light') return 'lite';
    if (n === 'extra') return 'extra';
  }
  return null;
}

// Left zone = Lite (−), center = the flavor (tap to add/remove), right zone =
// Extra (+). Picking a level selects the flavor if it isn't picked yet and
// never deselects it; tapping the center adds/removes the parent and clears its level.
export default function FlavorPillButton({
  mod,
  isSelected,
  onToggle,
  nestedSelection,
  onNestedChange,
  leading = null,
}) {
  if (!mod) return null;

  const level = getFlavorLevel(nestedSelection);
  const isLite = level === 'lite';
  const isExtra = level === 'extra';
  const nestedPrice = Object.values(nestedSelection || {}).reduce(
    (sum, sel) => sum + (Number((Array.isArray(sel) ? sel[0] : sel)?.price) || 0), 0);
  const price = (Number(mod.price) || 0) + nestedPrice;

  const handleLite = () => {
    if (!isSelected) onToggle?.();
    if (!isLite) onNestedChange?.(flavorNestedFor(mod, 'lite'));
  };

  const handleExtra = () => {
    if (!isSelected) onToggle?.();
    if (!isExtra) onNestedChange?.(flavorNestedFor(mod, 'extra'));
  };

  const handleCenter = () => {
    // Lite/Extra is a child preference, not a lock on the parent selection.
    onToggle?.();
    onNestedChange?.({});
  };

  return (
    <div className={`inline-flex items-stretch rounded-full border-2 overflow-hidden transition-all font-body text-sm font-semibold ${
      isSelected
        ? 'border-midnight-cherry bg-midnight-cherry/5'
        : 'border-gray-300 bg-white hover:border-midnight-cherry/50'
    }`}>
      <button
        type="button"
        onClick={handleLite}
        aria-pressed={isLite}
        aria-label={`Lite ${mod.name}`}
        title={`Lite ${mod.name}`}
        className={`group/lite flex items-center justify-center min-w-[44px] min-h-[44px] px-3 transition-colors ${
          isLite
            ? 'bg-midnight-cherry text-white'
            : 'text-midnight-cherry hover:bg-midnight-cherry/10 active:bg-midnight-cherry/15'
        }`}
      >
        <Minus size={14} className="group-hover/lite:hidden group-active/lite:hidden" />
        <span className="hidden group-hover/lite:inline group-active/lite:inline text-xs font-heading uppercase tracking-wide">Lite</span>
      </button>

      <button
        type="button"
        onClick={handleCenter}
        aria-pressed={isSelected}
        className={`flex items-center gap-1.5 px-4 py-2.5 transition-colors ${
          isSelected ? 'text-midnight-cherry' : 'text-obsidian-roast'
        }`}
      >
        {isSelected && <Check size={13} className="inline flex-shrink-0" />}
        {leading}
        <span>{isLite ? `Lite ${mod.name}` : isExtra ? `Extra ${mod.name}` : mod.name}</span>
        {price > 0 && (
          <span className={`text-xs ${isSelected ? 'text-midnight-cherry' : 'text-muted-foreground'}`}>
            +${price.toFixed(2)}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={handleExtra}
        aria-pressed={isExtra}
        aria-label={`Extra ${mod.name}`}
        title={`Extra ${mod.name}`}
        className={`group/extra flex items-center justify-center min-w-[44px] min-h-[44px] px-3 transition-colors ${
          isExtra
            ? 'bg-midnight-cherry text-white'
            : 'text-midnight-cherry hover:bg-midnight-cherry/10 active:bg-midnight-cherry/15'
        }`}
      >
        <Plus size={14} className="group-hover/extra:hidden group-active/extra:hidden" />
        <span className="hidden group-hover/extra:inline group-active/extra:inline text-xs font-heading uppercase tracking-wide">Extra</span>
      </button>
    </div>
  );
}