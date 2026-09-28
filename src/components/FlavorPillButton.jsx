import React from 'react';
import { Minus, Plus, Check } from 'lucide-react';

// Flavors are plain MULTIPLE options in Square's flavor list — unlike a sauce,
// they carry no Lite/Regular/Extra child options of their own. This pill gives
// every flavor button the same three zones the burger sauces use and records
// the level as a name prefix on the flavor's own catalog id ("Extra Cookies and
// Cream"), so the flavor stays one permitted catalog modifier: the cart, the
// kitchen ticket, and the server-side price check all keep working untouched.

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

export function getFlavorLevel(nestedSelection) {
  const n = (nestedSelection?.[FLAVOR_AMOUNT_LIST]?.name || '').toLowerCase();
  if (n === 'lite' || n === 'light') return 'lite';
  if (n === 'extra') return 'extra';
  return null;
}

// Left zone = Lite (−), center = the flavor (tap to add/remove), right zone =
// Extra (+). Picking a level selects the flavor if it isn't picked yet and
// never deselects it; the center returns it to regular (or removes it).
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
  const price = Number(mod.price) || 0;

  const handleLite = () => {
    if (!isSelected) onToggle?.();
    if (!isLite) onNestedChange?.(flavorAmountNested('lite'));
  };

  const handleExtra = () => {
    if (!isSelected) onToggle?.();
    if (!isExtra) onNestedChange?.(flavorAmountNested('extra'));
  };

  const handleCenter = () => {
    if (isSelected && level) {
      onNestedChange?.({});
      return;
    }
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
        aria-label={`Lite ${mod.name}`}
        title={`Lite ${mod.name}`}
        className={`group/lite flex items-center justify-center px-3 transition-colors ${
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
        aria-label={`Extra ${mod.name}`}
        title={`Extra ${mod.name}`}
        className={`group/extra flex items-center justify-center px-3 transition-colors ${
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