import React, { useState, useEffect } from 'react';
import { Package, Check, X, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { itemCategoryKey } from '@/lib/menuCategory';

function ModifierModal({ item, onClose, onConfirm }) {
  const initSelections = () => {
    if (!item.modifiers?.length) return {};
    return item.modifiers.reduce((acc, group) => {
      // Size groups default to the first option so every item carries a size.
      acc[group.name] = group.selection_type === 'MULTIPLE'
        ? []
        : (group.name === 'Size' ? (group.modifiers.find(m => !m.sold_out) || group.modifiers[0]) : null);
      return acc;
    }, {});
  };

  const [selections, setSelections] = useState(initSelections);

  const toggleSingle = (groupName, mod) =>
    // Size is required — tapping the selected size keeps it instead of clearing it.
    setSelections(prev => ({ ...prev, [groupName]: prev[groupName]?.id === mod.id ? (groupName === 'Size' ? mod : null) : mod }));

  const toggleMultiple = (groupName, mod) =>
    setSelections(prev => {
      const current = prev[groupName] || [];
      const exists = current.find(m => m.id === mod.id);
      return { ...prev, [groupName]: exists ? current.filter(m => m.id !== mod.id) : [...current, mod] };
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
      if (Array.isArray(sel)) sel.forEach(m => selectedMods.push({ group: groupName, name: m.name, price: m.price }));
      else selectedMods.push({ group: groupName, name: sel.name, price: sel.price });
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
          {item.modifiers.map(group => (
            <div key={group.name}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">{group.name}</h4>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {group.selection_type === 'MULTIPLE' ? 'Choose any' : 'Choose one'}
                </span>
              </div>
              <div className={group.modifiers.length > 10 ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
                {group.modifiers.map(mod => {
                  const isMultiple = group.selection_type === 'MULTIPLE';
                  const isSelected = isMultiple
                    ? (selections[group.name] || []).some(m => m.id === mod.id)
                    : selections[group.name]?.id === mod.id;
                  return (
                    <button
                      key={mod.id}
                      disabled={mod.sold_out}
                      onClick={() => isMultiple ? toggleMultiple(group.name, mod) : toggleSingle(group.name, mod)}
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
            <Plus size={16} /> Confirm — ${(item.price + extraCost).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ComboBuilderSection() {
  const [combos, setCombos] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [picks, setPicks] = useState({ main: null, side: null, drink: null });
  const [added, setAdded] = useState(false);
  const [modifierModal, setModifierModal] = useState(null); // { item, slot }
  const { addItem, setIsCartOpen } = useCart();

  useEffect(() => {
    Promise.all([
      base44.entities.ComboConfig.filter({ is_active: true }),
      base44.entities.MenuItem.filter({ is_available: true, is_hidden: false }),
    ]).then(([c, m]) => {
      setCombos(c || []);
      setMenuItems(m || []);
      if (c && c.length > 0) setSelectedCombo(c[0]);
    });
  }, []);

  if (combos.length === 0) return null;

  const itemsForCategory = (cat) =>
    menuItems.filter(i => itemCategoryKey(i).toLowerCase() === (cat || '').toLowerCase());

  const mainItems = selectedCombo ? itemsForCategory(selectedCombo.main_category) : [];
  const sideItems = selectedCombo ? itemsForCategory(selectedCombo.side_category) : [];
  const drinkItems = selectedCombo ? itemsForCategory(selectedCombo.drink_category) : [];

  const originalTotal = (picks.main?.price || 0) + (picks.side?.price || 0) + (picks.drink?.price || 0);
  const discount = selectedCombo ? (selectedCombo.discount_percent || 12) / 100 : 0.12;
  const comboPrice = originalTotal * (1 - discount);
  const allPicked = picks.main && picks.side && picks.drink;

  const handleSelectItem = (item, slot) => {
    if (item.modifiers && item.modifiers.length > 0) {
      setModifierModal({ item, slot });
    } else {
      setPicks(p => ({ ...p, [slot]: { ...item, selectedModifiers: [] } }));
    }
  };

  const handleModifierConfirm = (selectedMods, extraCost) => {
    const { item, slot } = modifierModal;
    setPicks(p => ({ ...p, [slot]: { ...item, price: item.price + extraCost, selectedModifiers: selectedMods } }));
    setModifierModal(null);
  };

  const handleAddCombo = () => {
    if (!allPicked) return;
    const name = `${selectedCombo.name}: ${picks.main.name} + ${picks.side.name} + ${picks.drink.name}`;
    const modSummary = [picks.main, picks.side, picks.drink]
      .flatMap(p => p.selectedModifiers || [])
      .map(m => m.name).join(', ');
    addItem({
      id: `combo-${Date.now()}`,
      name,
      description: modSummary || undefined,
      price: comboPrice,
      quantity: 1,
      selectedModifiers: [picks.main, picks.side, picks.drink].flatMap(p => p.selectedModifiers || []),
    });
    setAdded(true);
    setIsCartOpen(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleComboChange = (combo) => {
    setSelectedCombo(combo);
    setPicks({ main: null, side: null, drink: null });
  };

  const ItemPicker = ({ label, items, selected, slot }) => (
    <div>
      <p className="font-heading text-sm uppercase tracking-widest text-obsidian-roast mb-3">{label}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No items in this category</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {items.map(item => {
            const isSelected = selected?.id === item.id;
            const hasModifiers = item.modifiers && item.modifiers.length > 0;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectItem(item, slot)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  isSelected ? 'border-midnight-cherry bg-midnight-cherry/5' : 'border-border hover:border-midnight-cherry/40 bg-white'
                }`}
              >
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-xs text-obsidian-roast truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">${item.price?.toFixed(2)}</p>
                  {hasModifiers && !isSelected && (
                    <p className="text-xs text-patina-mint mt-0.5">Customizable</p>
                  )}
                  {isSelected && selected.selectedModifiers?.length > 0 && (
                    <p className="text-xs text-patina-mint mt-0.5 truncate">{selected.selectedModifiers.map(m => m.name).join(', ')}</p>
                  )}
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
          onClose={() => setModifierModal(null)}
          onConfirm={handleModifierConfirm}
        />
      )}

      <section className="py-16 px-4 sm:px-6 bg-obsidian-roast">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-midnight-cherry text-white px-4 py-1.5 rounded-full text-xs font-heading uppercase tracking-widest mb-3">
              <Package size={12} /> Combo Builder
            </div>
            <h2 className="font-heading text-4xl text-white mb-2">Build Your Combo</h2>
            <p className="text-gray-400 text-sm">Pick a main, a side, and a drink — and save when you bundle.</p>
          </div>

          {combos.length > 1 && (
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {combos.map(c => (
                <button key={c.id} onClick={() => handleComboChange(c)}
                  className={`px-5 py-2 rounded-full font-heading text-sm transition-all ${selectedCombo?.id === c.id ? 'bg-midnight-cherry text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 md:p-8">
            {selectedCombo?.description && (
              <p className="text-muted-foreground text-sm text-center mb-6">{selectedCombo.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <ItemPicker label={`Main — ${selectedCombo?.main_category}`} items={mainItems} selected={picks.main} slot="main" />
              <ItemPicker label={`Side — ${selectedCombo?.side_category}`} items={sideItems} selected={picks.side} slot="side" />
              <ItemPicker label={`Drink — ${selectedCombo?.drink_category}`} items={drinkItems} selected={picks.drink} slot="drink" />
            </div>

            <div className={`border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-opacity ${allPicked ? 'opacity-100' : 'opacity-50'}`}>
              <div>
                {allPicked ? (
                  <div className="space-y-0.5">
                    <p className="text-sm text-muted-foreground line-through">${originalTotal.toFixed(2)} separately</p>
                    <p className="font-heading text-3xl text-midnight-cherry">${comboPrice.toFixed(2)} <span className="text-sm font-body text-patina-mint">combo price</span></p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Pick one from each column to see your combo price</p>
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
        </div>
      </section>
    </>
  );
}