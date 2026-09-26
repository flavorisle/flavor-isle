import React, { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { componentTotal, round2 } from '@/lib/comboConfig';

// "Make it a combo" section for the product page. The customer picks one item
// from the combo's side category and one from its drink category; the combo's
// discount_percent applies to the whole combo (main + side + drink).
//
// Only catalog-backed options are offered — every component must carry a
// square_item_id so the server can reprice it. The parent renders this only
// when the combo's slots all resolved, so an empty slot can never appear.
//
// The parent owns the on/off toggle and the main item; this component owns the
// side + drink selections and reports the built components up via onChange.
export default function ComboPicker({ combo, active, onToggle, onChange }) {
  const [side, setSide] = useState(null);
  const [drink, setDrink] = useState(null);
  const [sideMods, setSideMods] = useState({});
  const [drinkMods, setDrinkMods] = useState({});
  const [customizing, setCustomizing] = useState(null); // 'side' | 'drink' | null

  // Reset when the offer changes (e.g. navigating to another item's page).
  useEffect(() => {
    setSide(null);
    setDrink(null);
    setSideMods({});
    setDrinkMods({});
    setCustomizing(null);
  }, [combo?.id]);

  const initMods = (menuItem) => {
    const init = {};
    (menuItem?.modifiers || []).forEach((g) => {
      init[g.name] = g.selection_type === 'MULTIPLE'
        ? []
        : (g.modifiers.find((m) => !m.sold_out) || null);
    });
    return init;
  };

  const pick = (slot, item) => {
    if (slot === 'side') { setSide(item); setSideMods(initMods(item)); } else { setDrink(item); setDrinkMods(initMods(item)); }
    setCustomizing(null);
  };

  const modsToCart = (mods) => {
    const out = [];
    for (const [group, sel] of Object.entries(mods || {})) {
      if (!sel) continue;
      if (Array.isArray(sel)) sel.forEach((m) => out.push({ group, name: m.name, price: m.price, id: m.id }));
      else out.push({ group, name: sel.name, price: sel.price, id: sel.id });
    }
    return out;
  };
  const modsLabel = (mods) => modsToCart(mods).map((m) => m.name).filter(Boolean).join(', ') || null;

  const sideSel = modsToCart(sideMods);
  const drinkSel = modsToCart(drinkMods);
  const sideComponent = side ? { name: side.name, square_item_id: side.square_item_id, total: componentTotal(side.price, sideSel), selectedModifiers: sideSel } : null;
  const drinkComponent = drink ? { name: drink.name, square_item_id: drink.square_item_id, total: componentTotal(drink.price, drinkSel), selectedModifiers: drinkSel } : null;
  const ready = !!(side && drink);
  const original = round2((sideComponent?.total || 0) + (drinkComponent?.total || 0));

  useEffect(() => {
    onChange({
      ready,
      sideName: side?.name || null,
      drinkName: drink?.name || null,
      sideModsLabel: modsLabel(sideMods),
      drinkModsLabel: modsLabel(drinkMods),
      sideComponent,
      drinkComponent,
      original,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, drink, sideMods, drinkMods]);

  const pct = Number(combo.discount_percent) || 0;

  const renderGroups = (menuItem, mods, setMods) => {
    if (!menuItem || !(menuItem.modifiers || []).length) {
      return <p className="text-xs text-muted-foreground">No customizations for this one.</p>;
    }
    return (
      <div className="space-y-3">
        {menuItem.modifiers.map((group) => {
          const multiple = group.selection_type === 'MULTIPLE';
          return (
            <div key={group.name} className="space-y-1.5">
              <h5 className="font-heading text-xs uppercase tracking-widest text-obsidian-roast">{group.name}</h5>
              <div className="flex flex-wrap gap-2">
                {group.modifiers.map((mod) => {
                  const sel = mods[group.name];
                  const isSelected = multiple ? (sel || []).some((m) => m.id === mod.id) : sel?.id === mod.id;
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      disabled={mod.sold_out}
                      onClick={() => setMods((prev) => {
                        if (multiple) {
                          const cur = prev[group.name] || [];
                          return { ...prev, [group.name]: cur.find((m) => m.id === mod.id) ? cur.filter((m) => m.id !== mod.id) : [...cur, mod] };
                        }
                        return { ...prev, [group.name]: prev[group.name]?.id === mod.id ? null : mod };
                      })}
                      className={`px-3 py-1.5 rounded-full border text-xs font-body font-semibold transition-all ${
                        mod.sold_out
                          ? 'border-gray-200 bg-muted opacity-50 cursor-not-allowed text-muted-foreground'
                          : isSelected
                            ? 'border-midnight-cherry bg-midnight-cherry/5 text-midnight-cherry'
                            : 'border-gray-300 bg-white text-obsidian-roast hover:border-midnight-cherry/50'
                      }`}
                    >
                      {mod.name}
                      {!mod.sold_out && mod.price > 0 && <span className="ml-1 text-muted-foreground">+${mod.price.toFixed(2)}</span>}
                      {isSelected && <Check size={11} className="ml-1 inline" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const slotRow = (slot, label, items, chosen, chosenModsLabel) => (
    <div className="space-y-1.5">
      <h4 className="font-heading text-xs uppercase tracking-widest text-obsidian-roast">{label}</h4>
      <div className="flex flex-wrap gap-2">
        {items.map((option) => {
          const isSelected = chosen?.id === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => pick(slot, option)}
              className={`px-3 py-2 rounded-xl border-2 text-sm font-body font-semibold transition-all ${
                isSelected ? 'border-midnight-cherry bg-midnight-cherry text-white' : 'border-border bg-white text-obsidian-roast hover:border-midnight-cherry/40'
              }`}
            >
              {option.name}
              {isSelected && <Check size={12} className="ml-1 inline" />}
            </button>
          );
        })}
      </div>
      {chosen && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {chosenModsLabel && <span className="text-muted-foreground">{chosenModsLabel}</span>}
          {(chosen.modifiers || []).length > 0 && (
            <button
              type="button"
              onClick={() => setCustomizing(customizing === slot ? null : slot)}
              className="text-patina-mint font-heading hover:text-midnight-cherry transition-colors"
            >
              {customizing === slot ? 'Done' : 'Customize'}
            </button>
          )}
        </div>
      )}
      {chosen && customizing === slot && (
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          {renderGroups(chosen, slot === 'side' ? sideMods : drinkMods, slot === 'side' ? setSideMods : setDrinkMods)}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">Make it a combo?</h4>
      <button
        type="button"
        onClick={() => onToggle(!active)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left ${
          active ? 'border-midnight-cherry bg-midnight-cherry text-white' : 'border-midnight-cherry/40 bg-midnight-cherry/5 text-midnight-cherry hover:bg-midnight-cherry/10'
        }`}
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full border-2 ${active ? 'bg-white border-white' : 'border-midnight-cherry'}`}>
            {active && <Check size={12} className="text-midnight-cherry" />}
          </span>
          <span className="min-w-0">
            <span className="font-heading text-sm flex items-center gap-1.5"><Sparkles size={14} /> {combo.name}</span>
            <span className={`block text-xs mt-0.5 ${active ? 'text-white/80' : 'text-muted-foreground'}`}>
              Add a side and a drink — save {pct}%
            </span>
          </span>
        </span>
        <span className={`text-xs font-heading flex-shrink-0 ${active ? 'text-white/80' : 'text-midnight-cherry'}`}>{active ? 'Added' : 'Add'}</span>
      </button>

      {active && (
        <div className="space-y-4 rounded-2xl border-2 border-midnight-cherry/25 bg-white p-4">
          {slotRow('side', combo.side_category, combo.side, side, modsLabel(sideMods))}
          {slotRow('drink', combo.drinkLabel || combo.drink_category, combo.drink, drink, modsLabel(drinkMods))}
          {!ready && (
            <p className="text-xs text-muted-foreground">Pick a side and a drink to finish your combo.</p>
          )}
        </div>
      )}
    </div>
  );
}