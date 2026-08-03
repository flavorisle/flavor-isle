import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, Check, Plus, ShoppingBag, ChevronRight, Package, User } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import GroupOrderBar from '@/components/GroupOrderBar';
import { useCart } from '@/context/CartContext';
import { base44 } from '@/api/base44Client';
import { itemCategoryKey } from '@/lib/menuCategory';

const STEPS = [
  { num: '01', label: 'COMBO', sub: 'Choose your bundle' },
  { num: '02', label: 'MAIN', sub: 'Pick the hero' },
  { num: '03', label: 'SIDE', sub: 'Pick the side' },
  { num: '04', label: 'DRINK', sub: 'Pick the drink' },
  { num: '05', label: 'NAME IT', sub: 'Customize & add' },
];

function ModifierModal({ item, onClose, onConfirm }) {
  const initSelections = () => {
    if (!item.modifiers?.length) return {};
    return item.modifiers.reduce((acc, group) => {
      acc[group.name] = group.selection_type === 'MULTIPLE'
        ? []
        : (group.name === 'Size' ? (group.modifiers.find(m => !m.sold_out) || group.modifiers[0]) : null);
      return acc;
    }, {});
  };
  const [selections, setSelections] = useState(initSelections);

  const toggleSingle = (g, mod) =>
    setSelections(prev => ({ ...prev, [g]: prev[g]?.id === mod.id ? (g === 'Size' ? mod : null) : mod }));
  const toggleMultiple = (g, mod) =>
    setSelections(prev => {
      const cur = prev[g] || [];
      return { ...prev, [g]: cur.find(m => m.id === mod.id) ? cur.filter(m => m.id !== mod.id) : [...cur, mod] };
    });
  const extraCost = Object.values(selections).reduce((sum, sel) => {
    if (!sel) return sum;
    if (Array.isArray(sel)) return sum + sel.reduce((s, m) => s + (m.price || 0), 0);
    return sum + (sel.price || 0);
  }, 0);

  const handleConfirm = () => {
    const mods = [];
    for (const [g, sel] of Object.entries(selections)) {
      if (!sel) continue;
      if (Array.isArray(sel)) sel.forEach(m => mods.push({ group: g, name: m.name, price: m.price }));
      else mods.push({ group: g, name: sel.name, price: sel.price });
    }
    onConfirm(mods, extraCost);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-float-lg w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex-1 mr-4">
            <h3 className="font-heading text-xl text-obsidian-roast">{item.name}</h3>
            {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full flex-shrink-0"><Plus size={20} className="rotate-45" /></button>
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
              <div className="space-y-2">
                {group.modifiers.map(mod => {
                  const multi = group.selection_type === 'MULTIPLE';
                  const selected = multi ? (selections[group.name] || []).some(m => m.id === mod.id) : selections[group.name]?.id === mod.id;
                  return (
                    <button key={mod.id} disabled={mod.sold_out}
                      onClick={() => multi ? toggleMultiple(group.name, mod) : toggleSingle(group.name, mod)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all ${mod.sold_out ? 'opacity-50 cursor-not-allowed border-border bg-muted' : selected ? 'border-midnight-cherry bg-midnight-cherry/5' : 'border-border hover:border-midnight-cherry/40 bg-white'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full border-2 ${selected ? 'bg-midnight-cherry border-midnight-cherry' : 'border-gray-300'}`}>
                          {selected && <Check size={12} className="text-white" />}
                        </div>
                        <span className="font-body text-sm text-obsidian-roast">{mod.name}</span>
                      </div>
                      {mod.price > 0 && <span className="text-sm text-patina-mint font-semibold">+${mod.price.toFixed(2)}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 border-t border-border">
          <button onClick={handleConfirm} className="btn-cherry chrome-hover w-full py-4 font-heading text-sm flex items-center justify-center gap-2">
            <Check size={16} /> Confirm Modifiers
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Combos() {
  const { addItem, setIsCartOpen, cartItems, groupMode, activePerson, people, setActivePersonId } = useCart();
  const navigate = useNavigate();
  const [combos, setCombos] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [picks, setPicks] = useState({ main: null, side: null, drink: null });
  const [customName, setCustomName] = useState('');
  const [step, setStep] = useState(0);
  const [added, setAdded] = useState(false);
  const [modifierModal, setModifierModal] = useState(null);
  const builderRef = useRef(null);

  useEffect(() => {
    Promise.all([
      base44.entities.ComboConfig.filter({ is_active: true }),
      base44.entities.MenuItem.filter({ is_available: true, is_hidden: false }),
    ]).then(([c, m]) => {
      setCombos(c || []);
      setMenuItems(m || []);
      if (c?.length) setSelectedCombo(c[0]);
    });
  }, []);

  if (combos.length === 0) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
        <Navbar />
        <CartDrawer />
        <div className="max-w-lg mx-auto py-32 px-4 text-center">
          <Package size={56} className="mx-auto text-muted-foreground mb-4" />
          <h2 className="font-heading text-3xl text-obsidian-roast mb-2">No Combos Yet</h2>
          <p className="text-muted-foreground mb-8">Our combo builder is being prepped. Check back soon!</p>
          <button onClick={() => navigate('/menu')} className="btn-cherry chrome-hover px-8 py-4 text-sm font-heading">Browse the Menu</button>
        </div>
        <Footer />
      </div>
    );
  }

  const itemsForCategory = (cat) =>
    menuItems.filter(i => itemCategoryKey(i).toLowerCase() === (cat || '').toLowerCase());

  const mainItems = selectedCombo ? itemsForCategory(selectedCombo.main_category) : [];
  const sideItems = selectedCombo ? itemsForCategory(selectedCombo.side_category) : [];
  const drinkItems = selectedCombo ? itemsForCategory(selectedCombo.drink_category) : [];

  const originalTotal = (picks.main?.price || 0) + (picks.side?.price || 0) + (picks.drink?.price || 0);
  const discount = (selectedCombo?.discount_percent || 12) / 100;
  const comboPrice = +(originalTotal * (1 - discount)).toFixed(2);
  const allPicked = picks.main && picks.side && picks.drink;

  const handleSelectItem = (item, slot) => {
    if (item.modifiers?.length > 0) {
      setModifierModal({ item, slot });
    } else {
      setPicks(p => ({ ...p, [slot]: { ...item, selectedModifiers: [] } }));
    }
  };
  const handleModifierConfirm = (mods, extra) => {
    const { item, slot } = modifierModal;
    setPicks(p => ({ ...p, [slot]: { ...item, price: item.price + extra, selectedModifiers: mods } }));
    setModifierModal(null);
  };

  // Number combos sequentially so multiples in the same order are distinguishable
  // on the kitchen ticket (Combo #1, #2, …) and never merge into one line.
  const comboCountInCart = cartItems.filter(i => i.isCombo).length;
  const nextComboNumber = comboCountInCart + 1;
  const baseName = customName.trim() || `${picks.main?.name || ''} + ${picks.side?.name || ''} + ${picks.drink?.name || ''}`;
  const personLabel = groupMode && activePerson ? `${activePerson.name}'s ` : '';
  const finalName = `Combo #${nextComboNumber} — ${personLabel}${baseName}`;

  const handleAddCombo = () => {
    if (!allPicked) return;
    const modSummary = [picks.main, picks.side, picks.drink].flatMap(p => p.selectedModifiers || []).map(m => m.name).join(', ');
    addItem({
      id: `combo-${selectedCombo.id}-${Date.now()}`,
      alwaysUnique: true,
      isCombo: true,
      comboNumber: nextComboNumber,
      name: finalName,
      comboConfigName: selectedCombo.name,
      description: modSummary || undefined,
      price: comboPrice,
      quantity: 1,
      selectedModifiers: [picks.main, picks.side, picks.drink].flatMap(p => p.selectedModifiers || []),
      contents: {
        main: picks.main.name,
        side: picks.side.name,
        drink: picks.drink.name,
      },
    });
    setAdded(true);
    setIsCartOpen(true);
    setTimeout(() => setAdded(false), 1800);
    // Reset for the next combo but stay on the builder
    setPicks({ main: null, side: null, drink: null });
    setCustomName('');
    setStep(1);
  };

  const scrollToBuilder = () => builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const canProceed = step === 0 ? !!selectedCombo : step === 1 ? !!picks.main : step === 2 ? !!picks.side : step === 3 ? !!picks.drink : allPicked;

  const ItemPicker = ({ items, slot, selected, label, emoji }) => (
    <div>
      <p className="font-heading text-sm uppercase tracking-widest text-obsidian-roast mb-3">{emoji} {label}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No items in this category</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {items.map(item => {
            const selectedNow = selected?.id === item.id;
            const hasMods = item.modifiers?.length > 0;
            return (
              <button key={item.id} onClick={() => handleSelectItem(item, slot)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${selectedNow ? 'border-midnight-cherry bg-midnight-cherry/5' : 'border-border hover:border-midnight-cherry/40 bg-white'}`}>
                {item.image_url && <img src={item.image_url} alt={item.name} className="w-12 h-12 object-cover rounded-lg flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm text-obsidian-roast truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">${item.price?.toFixed(2)}{hasMods && !selectedNow && <span className="text-patina-mint"> · Customizable</span>}</p>
                  {selectedNow && selected.selectedModifiers?.length > 0 && (
                    <p className="text-xs text-patina-mint mt-0.5 truncate">{selected.selectedModifiers.map(m => m.name).join(', ')}</p>
                  )}
                </div>
                {selectedNow ? <Check size={16} className="text-midnight-cherry flex-shrink-0" /> : hasMods && <span className="text-xs bg-patina-mint/10 text-patina-mint px-2 py-0.5 rounded-full font-heading flex-shrink-0">Edit</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <GroupOrderBar />
      <CartDrawer />

      {/* Hero */}
      <section className="relative overflow-hidden bg-obsidian-roast min-h-[70vh] flex flex-col items-center justify-center px-4 sm:px-6 text-center">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(204,51,0,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 30%, rgba(0,51,102,0.4) 0%, transparent 55%)`
        }} />
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-smashie-yellow text-obsidian-roast px-5 py-2.5 rounded-full text-xs font-heading uppercase tracking-widest mb-8">
            <Package size={14} /> Coming Soon
          </div>
          <h1 className="font-heading text-7xl sm:text-9xl text-white leading-none mb-4">COMBO ISLE</h1>
          <p className="text-gray-300 text-lg mb-2">Pick a main, a side, and a drink.</p>
          <p className="text-gray-400 text-base mb-12">Name it. Stack it.</p>
          <button onClick={scrollToBuilder} className="btn-cherry chrome-hover inline-flex items-center gap-3 px-10 py-5 font-heading text-base">
            Learn More <ArrowDown size={18} />
          </button>
        </div>
      </section>

      {/* Coming Soon */}
      <section ref={builderRef} className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-smashie-yellow/20 text-smashie-yellow px-4 py-2 rounded-full text-xs font-heading uppercase tracking-widest mb-6">
            <Package size={14} /> Coming Soon
          </div>
          <h2 className="font-heading text-5xl sm:text-6xl text-obsidian-roast mb-4">COMBO BUILDER</h2>
          <p className="text-muted-foreground text-lg mb-10">We're cooking up something special. Our combo builder will let you mix a main, a side, and a drink into one stacked deal — stay tuned!</p>
          <button onClick={() => navigate('/menu')} className="btn-cherry chrome-hover inline-flex items-center gap-2 px-8 py-4 font-heading text-sm">
            <ShoppingBag size={16} /> Order from the Menu
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}