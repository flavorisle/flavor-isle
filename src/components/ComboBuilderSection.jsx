import React, { useState, useEffect } from 'react';
import { Package, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';

export default function ComboBuilderSection() {
  const [combos, setCombos] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [picks, setPicks] = useState({ main: null, side: null, drink: null });
  const [added, setAdded] = useState(false);
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
    menuItems.filter(i => (i.square_category || i.category || '').toLowerCase() === (cat || '').toLowerCase());

  const mainItems = selectedCombo ? itemsForCategory(selectedCombo.main_category) : [];
  const sideItems = selectedCombo ? itemsForCategory(selectedCombo.side_category) : [];
  const drinkItems = selectedCombo ? itemsForCategory(selectedCombo.drink_category) : [];

  const originalTotal = (picks.main?.price || 0) + (picks.side?.price || 0) + (picks.drink?.price || 0);
  const discount = selectedCombo ? (selectedCombo.discount_percent || 12) / 100 : 0.12;
  const comboPrice = originalTotal * (1 - discount);

  const allPicked = picks.main && picks.side && picks.drink;

  const handleAddCombo = () => {
    if (!allPicked) return;
    addItem({ id: `combo-${Date.now()}`, name: `${selectedCombo.name}: ${picks.main.name} + ${picks.side.name} + ${picks.drink.name}`, price: comboPrice, quantity: 1 });
    setAdded(true);
    setIsCartOpen(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleComboChange = (combo) => {
    setSelectedCombo(combo);
    setPicks({ main: null, side: null, drink: null });
  };

  const ItemPicker = ({ label, items, selected, onSelect }) => (
    <div>
      <p className="font-heading text-sm uppercase tracking-widest text-obsidian-roast mb-3">{label}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No items in this category</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                selected?.id === item.id
                  ? 'border-midnight-cherry bg-midnight-cherry/5'
                  : 'border-border hover:border-midnight-cherry/40 bg-white'
              }`}
            >
              {item.image_url && (
                <img src={item.image_url} alt={item.name} className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-heading text-xs text-obsidian-roast truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">${item.price?.toFixed(2)}</p>
              </div>
              {selected?.id === item.id && (
                <Check size={16} className="text-midnight-cherry flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <section className="py-16 px-4 sm:px-6 bg-obsidian-roast">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-midnight-cherry text-white px-4 py-1.5 rounded-full text-xs font-heading uppercase tracking-widest mb-3">
            <Package size={12} /> Combo Builder
          </div>
          <h2 className="font-heading text-4xl text-white mb-2">Build Your Combo</h2>
          <p className="text-gray-400 text-sm">Pick a main, a side, and a drink — and save when you bundle.</p>
        </div>

        {/* Combo selector tabs */}
        {combos.length > 1 && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {combos.map(c => (
              <button
                key={c.id}
                onClick={() => handleComboChange(c)}
                className={`px-5 py-2 rounded-full font-heading text-sm transition-all ${
                  selectedCombo?.id === c.id
                    ? 'bg-midnight-cherry text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
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
            <ItemPicker label={`Main — ${selectedCombo?.main_category}`} items={mainItems} selected={picks.main} onSelect={item => setPicks(p => ({ ...p, main: item }))} />
            <ItemPicker label={`Side — ${selectedCombo?.side_category}`} items={sideItems} selected={picks.side} onSelect={item => setPicks(p => ({ ...p, side: item }))} />
            <ItemPicker label={`Drink — ${selectedCombo?.drink_category}`} items={drinkItems} selected={picks.drink} onSelect={item => setPicks(p => ({ ...p, drink: item }))} />
          </div>

          {/* Summary */}
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
  );
}