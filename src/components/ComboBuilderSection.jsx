import React, { useEffect, useMemo, useState } from 'react';
import { Check, X, Plus, Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { applyModifierOverrides } from '@/lib/modifierOverrides';
import { optimizedImageUrl } from '@/lib/utils';
import {
  DEFAULT_COMBO_SETTING,
  boxCharge,
  boxTotal,
  boxLabel,
  loadComboSetting,
  itemsForRole,
  shakesForSubstitution,
  requiredQuantity,
  allocateBoxUnitCharges,
  nextBoxNumber,
  round2,
} from '@/lib/comboIsle';

// Combo Isle is a picker, not a catalogue of prebuilt combos (Wesley, Nov 15 2026).
// The customer picks one main, one side and one drink from the live Square menu,
// and the three real items go into the cart as themselves — so the kitchen ticket,
// the Square order and the price verification all see ordinary catalog items.
// The total is Square's three prices added. There is no discount anywhere here.

// What is a main, what is a side and what is a drink is an admin setting now
// (/admin/combo-isle), so these columns come from the saved record, not from a
// list in this file. A row without a square_item_id is never offered: every line
// is repriced from Square on the server.


function ModifierModal({ item, onClose, onConfirm, overrides }) {
  // A combo component keeps the same Square modifier choices and prices it has
  // everywhere else on the site.
  const groups = applyModifierOverrides(item.modifiers, overrides);

  const initSelections = () => {
    if (!groups.length) return {};
    return groups.reduce((acc, group) => {
      acc[group.name] = group.selection_type === 'MULTIPLE'
        ? []
        : (group.name === 'Size' ? (group.modifiers.find((m) => !m.sold_out) || group.modifiers[0]) : null);
      return acc;
    }, {});
  };

  const [selections, setSelections] = useState(initSelections);

  const toggleSingle = (groupName, mod) =>
    setSelections((prev) => ({
      ...prev,
      [groupName]: prev[groupName]?.id === mod.id ? (groupName === 'Size' ? mod : null) : mod,
    }));

  const toggleMultiple = (groupName, mod) =>
    setSelections((prev) => {
      const current = prev[groupName] || [];
      const exists = current.find((m) => m.id === mod.id);
      return {
        ...prev,
        [groupName]: exists ? current.filter((m) => m.id !== mod.id) : [...current, mod],
      };
    });

  const extraCost = Object.values(selections).reduce((sum, sel) => {
    if (!sel) return sum;
    if (Array.isArray(sel)) return sum + sel.reduce((s, m) => s + (m.price || 0), 0);
    return sum + (sel.price || 0);
  }, 0);

  const handleConfirm = () => {
    const selectedMods = [];
    for (const [groupName, sel] of Object.entries(selections)) {
      if (!sel) continue;
      if (Array.isArray(sel)) sel.forEach((m) => selectedMods.push({ id: m.id, group: groupName, name: m.name, price: m.price }));
      else selectedMods.push({ id: sel.id, group: groupName, name: sel.name, price: sel.price });
    }
    onConfirm(selectedMods, extraCost);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-float-lg w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex-1 mr-4">
            <h3 className="font-heading text-xl text-obsidian-roast">{item.name}</h3>
            {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {groups.map((group) => (
            <div key={group.name}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">{group.name}</h4>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {group.selection_type === 'MULTIPLE' ? 'Choose any' : 'Choose one'}
                </span>
              </div>
              <div className={group.modifiers.length > 10 ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
                {group.modifiers.map((mod) => {
                  const isMultiple = group.selection_type === 'MULTIPLE';
                  const isSelected = isMultiple
                    ? (selections[group.name] || []).some((m) => m.id === mod.id)
                    : selections[group.name]?.id === mod.id;
                  return (
                    <button
                      key={mod.id}
                      disabled={mod.sold_out}
                      onClick={() => (isMultiple ? toggleMultiple(group.name, mod) : toggleSingle(group.name, mod))}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${mod.sold_out ? 'border-border bg-muted opacity-50 cursor-not-allowed' : isSelected ? 'border-midnight-cherry bg-red-50' : 'border-border hover:border-gray-300 bg-white'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-all ${isSelected ? 'bg-midnight-cherry border-midnight-cherry' : 'border-gray-300'}`}>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                        <span className="font-body text-sm text-obsidian-roast">{mod.name}</span>
                      </div>
                      {mod.sold_out ? (
                        <span className="text-xs text-muted-foreground font-semibold uppercase">Sold Out</span>
                      ) : mod.price > 0 && <span className="text-sm text-patina-mint font-semibold">+${mod.price.toFixed(2)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-border">
          <button onClick={handleConfirm} className="btn-cherry chrome-hover w-full py-4 font-heading text-sm flex items-center justify-center gap-2">
            <Plus size={16} /> Confirm — ${round2(item.price + extraCost).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ComboBuilderSection() {
  const [menuItems, setMenuItems] = useState([]);
  const [setting, setSetting] = useState(DEFAULT_COMBO_SETTING);
  const [loading, setLoading] = useState(true);
  const [picks, setPicks] = useState({ main: null, side: null, drink: null, shake: null });
  const [shakeInstead, setShakeInstead] = useState(false);
  const [added, setAdded] = useState(false);
  const [modifierModal, setModifierModal] = useState(null);
  const { addItem, cartItems, setIsCartOpen, menuSetting } = useCart();
  const overrides = menuSetting?.modifier_overrides;

  useEffect(() => {
    let alive = true;
    Promise.all([
      base44.entities.MenuItem.filter({ is_available: true, is_hidden: false }, '-name', 500),
      loadComboSetting(),
    ])
      .then(([rows, saved]) => {
        if (!alive) return;
        // Only catalog-backed items: the server reprices every line from Square.
        setMenuItems((rows || []).filter((i) => i.square_item_id));
        setSetting(saved || DEFAULT_COMBO_SETTING);
      })
      .catch(() => { if (alive) setMenuItems([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const mains = useMemo(() => itemsForRole(menuItems, setting, 'main'), [menuItems, setting]);
  const sides = useMemo(() => itemsForRole(menuItems, setting, 'side'), [menuItems, setting]);
  const drinks = useMemo(() => itemsForRole(menuItems, setting, 'drink'), [menuItems, setting]);
  const shakes = useMemo(() => shakesForSubstitution(menuItems, setting), [menuItems, setting]);

  // The drink column swaps to shakes when the customer takes the substitution.
  const drinkChoices = shakeInstead ? shakes : drinks;
  const drinkPick = shakeInstead ? picks.shake : picks.drink;

  const components = [picks.main, picks.side, drinkPick].filter(Boolean);
  const total = boxTotal(components);
  const price = boxCharge(total);
  const allPicked = Boolean(picks.main && picks.side && drinkPick);
  const canBuild = mains.length > 0 && sides.length > 0 && (drinks.length > 0 || shakes.length > 0);

  const handleSelectItem = (item, slot) => {
    const quantity = requiredQuantity(setting, item);
    if (applyModifierOverrides(item.modifiers, overrides).length > 0) {
      setModifierModal({ item, slot, quantity });
    } else {
      setPicks((p) => ({ ...p, [slot]: { ...item, quantity, selectedModifiers: [] } }));
    }
  };

  const handleModifierConfirm = (selectedMods, extraCost) => {
    const { item, slot, quantity } = modifierModal;
    setPicks((p) => ({
      ...p,
      [slot]: { ...item, quantity, price: round2((item.price || 0) + extraCost), selectedModifiers: selectedMods },
    }));
    setModifierModal(null);
  };

  // One box goes in as its real Square items, in a numbered group. The lines carry
  // the box's charged price between them — so nothing on the page, in the cart, or
  // on the ticket ever reads as a discount — and each keeps its full Square price
  // so a broken box can go back to being singles at that price.
  const handleAddCombo = () => {
    if (!allPicked) return;
    const chosen = [picks.main, picks.side, drinkPick];
    const roles = ['main', 'side', 'drink'];
    const units = allocateBoxUnitCharges(chosen);
    const comboGroup = `box-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const boxNumber = nextBoxNumber(cartItems);
    chosen.forEach((pick, i) => {
      addItem({
        ...pick,
        productId: pick.id,
        selectedModifiers: pick.selectedModifiers || [],
        price: units[i],
        comboFullPrice: round2(pick.price || 0),
        initialQuantity: pick.quantity || 1,
        comboGroup,
        comboRole: roles[i],
        comboBox: boxNumber,
        alwaysUnique: true,
        bundleName: boxLabel(boxNumber),
      });
    });
    setAdded(true);
    setIsCartOpen(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const ItemPicker = ({ label, sub, items, selected, slot }) => (
    <div>
      <p className="font-heading text-sm uppercase tracking-widest text-obsidian-roast mb-1">{label}</p>
      <p className="text-[11px] text-muted-foreground mb-3">{sub}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          Nothing available in this column right now.
        </p>
      ) : (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {items.map((item) => {
            const isSelected = selected?.id === item.id;
            const hasModifiers = applyModifierOverrides(item.modifiers, overrides).length > 0;
            const showMods = isSelected && selected.selectedModifiers?.length > 0;
            const quantity = requiredQuantity(setting, item);
            return (
              <button
                key={item.id}
                onClick={() => handleSelectItem(item, slot)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  isSelected ? 'border-midnight-cherry bg-midnight-cherry/5' : 'border-border hover:border-midnight-cherry/40 bg-white'
                }`}
              >
                {(item.image_url_opt || item.image_url) && (
                  <img
                    src={optimizedImageUrl(item.image_url_opt || item.image_url, 200, 200)}
                    alt={item.name}
                    width="200"
                    height="200"
                    loading="lazy"
                    decoding="async"
                    className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-xs text-obsidian-roast truncate">
                    {quantity > 1 ? `${quantity} \u00d7 ${item.name}` : item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {quantity > 1 ? `$${((item.price || 0) * quantity).toFixed(2)}` : `$${(item.price || 0).toFixed(2)}`}
                  </p>
                  {showMods ? (
                    <p className="text-xs text-patina-mint mt-0.5 truncate">
                      {selected.selectedModifiers.filter((m) => m.name && !m.silent).map((m) => m.name).join(', ')}
                    </p>
                  ) : hasModifiers ? (
                    <p className="text-xs text-patina-mint mt-0.5">Customizable</p>
                  ) : null}
                </div>
                {isSelected ? (
                  <Check size={16} className="text-midnight-cherry flex-shrink-0" />
                ) : hasModifiers ? (
                  <span className="text-xs bg-patina-mint/10 text-patina-mint px-2 py-0.5 rounded-full font-heading flex-shrink-0">Edit</span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <>
      {modifierModal && (
        <ModifierModal
          item={modifierModal.item}
          overrides={overrides}
          onClose={() => setModifierModal(null)}
          onConfirm={handleModifierConfirm}
        />
      )}

      <section id="combo-builder" className="py-16 px-4 sm:px-6 bg-obsidian-roast">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-smashie-yellow text-obsidian-roast px-4 py-1.5 rounded-full text-xs font-heading uppercase tracking-widest mb-3">
              <Package size={12} /> Build It Now
            </div>
            <h2 className="font-heading text-4xl text-white mb-2">Build Your Combo</h2>
            <p className="text-gray-400 text-sm">Pick a main, a side, and a drink.</p>
          </div>

          {!canBuild ? (
            <div className="bg-white rounded-3xl p-8 text-center">
              <p className="font-heading text-lg text-obsidian-roast mb-2">The combo builder is off right now</p>
              <p className="text-muted-foreground text-sm">
                {loading
                  ? 'Loading the menu\u2026'
                  : 'One of the three columns has nothing available, so there is no combo to build. Everything is still on the menu.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <ItemPicker label="Main" sub="Burgers, chicken, dogs and sandwiches" items={mains} selected={picks.main} slot="main" />
                <ItemPicker label="Side" sub="Fries, tots, rings and munchies" items={sides} selected={picks.side} slot="side" />

                <div>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-heading text-sm uppercase tracking-widest text-obsidian-roast mb-1">Drink</p>
                    {shakes.length > 0 && (
                      <button
                        onClick={() => setShakeInstead((v) => !v)}
                        className={`text-[11px] font-heading px-2 py-1 rounded-full border transition-colors ${
                          shakeInstead ? 'bg-midnight-cherry text-white border-midnight-cherry' : 'border-border text-muted-foreground hover:border-midnight-cherry/40'
                        }`}
                      >
                        {shakeInstead ? 'Milkshake' : 'Large milkshake instead'}
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    {shakeInstead ? 'Thick shake, same box' : 'Sodas, teas and floats'}
                  </p>
                  {drinkChoices.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Nothing available in this column right now.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {drinkChoices.map((item) => {
                        const selected = drinkPick;
                        const isSelected = selected?.id === item.id;
                        const quantity = requiredQuantity(setting, item);
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelectItem(item, shakeInstead ? 'shake' : 'drink')}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                              isSelected ? 'border-midnight-cherry bg-midnight-cherry/5' : 'border-border hover:border-midnight-cherry/40 bg-white'
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-heading text-xs text-obsidian-roast truncate">
                                {quantity > 1 ? `${quantity} \u00d7 ${item.name}` : item.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {quantity > 1 ? `$${((item.price || 0) * quantity).toFixed(2)}` : `$${(item.price || 0).toFixed(2)}`}
                              </p>
                            </div>
                            {isSelected && <Check size={16} className="text-midnight-cherry flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className={`border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-opacity ${allPicked ? 'opacity-100' : 'opacity-60'}`}>
                <div>
                  {allPicked ? (
                    <div className="space-y-0.5">
                      <p className="font-heading text-3xl text-midnight-cherry">${price.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {picks.main.name} + {picks.side.name} + {drinkPick.name}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Pick one from each column to see your total</p>
                  )}
                </div>
                <button
                  onClick={handleAddCombo}
                  disabled={!allPicked}
                  className="btn-cherry chrome-hover px-8 py-3.5 text-sm font-heading disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {added ? <><Check size={16} /> Added!</> : 'Add Combo to Order'}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
