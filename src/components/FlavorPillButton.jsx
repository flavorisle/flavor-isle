import React from 'react';
import { Check } from 'lucide-react';

// Flavors get the same three zones the burger sauces use: Lite left, Extra right.
// When Square attaches its own "- / + Flavors" child list to the flavor, the
// real nested option (catalog id + price) is recorded so Square receives it as a
// catalog modifier; otherwise the level rides as a name prefix on the flavor's
// own catalog id. Either way the cart, the kitchen ticket, and the server-side
// price check keep working.

export const FLAVOR_AMOUNT_LIST = 'Flavor Amount';

export function isFlavorGroup(group) {
  return /flavor/i.test(group?.name || '');
}

// Fallback shape used only when a flavor carries NO child list: an id-less
// placeholder so the level can still ride as a name prefix, never sent to
// Square as a modifier of its own.
export function flavorAmountNested(level) {
  if (!level) return {};
  return { [FLAVOR_AMOUNT_LIST]: { name: level === 'lite' ? 'Lite' : 'Extra', price: 0 } };
}

// The real "- / + Flavors" child list Square attaches to a flavor option, when
// it has one.
export function flavorChildList(mod) {
  const lists = mod?.child_modifier_lists || [];
  return lists.find((l) => /flavor/i.test(l?.name || '')) || lists[0] || null;
}

// Records the real nested "- / + Flavors" option (its catalog id AND price) for
// a Lite/Extra level, so Square receives it as a catalog modifier on the cart
// line. Falls back to the id-less Flavor Amount row only when the flavor has no
// child list at all.
export function flavorNestedForLevel(mod, level) {
  if (!level) return {};
  const list = flavorChildList(mod);
  const want = level === 'lite' ? /^(lite|light)$/i : /^extra$/i;
  const opt = (list?.modifiers || []).find((m) => want.test(String(m?.name || '').trim()));
  if (list && opt) {
    return { [list.name || FLAVOR_AMOUNT_LIST]: { id: opt.id, name: opt.name, price: Number(opt.price) || 0 } };
  }
  return flavorAmountNested(level);
}

// Reads the level from ANY nested list — the real "- / + Flavors" list or the
// synthetic Flavor Amount row.
export function getFlavorLevel(nestedSelection) {
  if (!nestedSelection || typeof nestedSelection !== 'object') return null;
  for (const entry of Object.values(nestedSelection)) {
    const n = String(entry?.name || '').toLowerCase().trim();
    if (n === 'lite' || n === 'light') return 'lite';
    if (n === 'extra') return 'extra';
  }
  return null;
}

// Total of any nested option prices; the flavor's own price is added by the pill.
export function getFlavorNestedPrice(nestedSelection) {
  if (!nestedSelection) return 0;
  return Object.values(nestedSelection).reduce((sum, entry) => sum + (Number(entry?.price) || 0), 0);
}

// Left zone = Lite, center = the flavor (tap to add/remove), right zone = Extra.
// Both side zones are filled chips with their word always visible. Picking a
// level selects the flavor if it isn't picked yet and never deselects it;
// tapping the center adds/removes the parent and clears its level.
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
  const nestedPrice = getFlavorNestedPrice(nestedSelection);
  const totalPrice = price + nestedPrice;

  const handleLite = () => {
    if (!isSelected) onToggle?.();
    if (!isLite) onNestedChange?.(flavorNestedForLevel(mod, 'lite'));
  };

  const handleExtra = () => {
    if (!isSelected) onToggle?.();
    if (!isExtra) onNestedChange?.(flavorNestedForLevel(mod, 'extra'));
  };

  const handleCenter = () => {
    // Lite/Extra is a child preference, not a lock on the parent selection.
    onToggle?.();
    onNestedChange?.({});
  };

  return (
    <div className={`inline-flex max-w-full min-w-0 flex-1 basis-[47%] items-stretch rounded-full border-2 overflow-hidden transition-all font-body text-sm font-semibold sm:flex-none ${
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
        className={`flex min-w-[36px] min-h-[44px] items-center justify-center px-1 transition-colors sm:min-w-[44px] sm:px-3 ${
          isLite
            ? 'bg-midnight-cherry text-white'
            : 'bg-midnight-cherry/10 text-midnight-cherry hover:bg-midnight-cherry/20 active:bg-midnight-cherry/25'
        }`}
      >
        <span className="text-[10px] font-heading uppercase tracking-wide sm:text-xs">Lite</span>
      </button>

      <button
        type="button"
        onClick={handleCenter}
        aria-pressed={isSelected}
        className={`flex min-w-0 flex-1 items-center justify-center gap-1 px-1.5 py-2.5 transition-colors sm:px-4 ${
          isSelected ? 'text-midnight-cherry' : 'text-obsidian-roast'
        }`}
      >
        {isSelected && <Check size={13} className="inline flex-shrink-0" />}
        {/* The emoji rides inside the label so the name wraps at its own space
            in a narrow phone cell instead of being squeezed beside it. */}
        <span className="min-w-0 break-words text-[13px] leading-tight sm:text-sm">
          {leading ? <span className="mr-1 inline-block">{leading}</span> : null}
          {isLite ? `Lite ${mod.name}` : isExtra ? `Extra ${mod.name}` : mod.name}
        </span>
        {totalPrice > 0 && (
          <span className={`whitespace-nowrap text-[11px] sm:text-xs ${isSelected ? 'text-midnight-cherry' : 'text-muted-foreground'}`}>
            +${totalPrice.toFixed(2)}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={handleExtra}
        aria-pressed={isExtra}
        aria-label={`Extra ${mod.name}`}
        title={`Extra ${mod.name}`}
        className={`flex min-w-[36px] min-h-[44px] items-center justify-center px-1 transition-colors sm:min-w-[44px] sm:px-3 ${
          isExtra
            ? 'bg-midnight-cherry text-white'
            : 'bg-midnight-cherry/10 text-midnight-cherry hover:bg-midnight-cherry/20 active:bg-midnight-cherry/25'
        }`}
      >
        <span className="text-[10px] font-heading uppercase tracking-wide sm:text-xs">Extra</span>
      </button>
    </div>
  );
}