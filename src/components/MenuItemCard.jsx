import React, { useState } from 'react';
import { Plus, Zap, X, Check } from 'lucide-react';
import { useCart } from '@/context/CartContext';

function ModifierModal({ item, onClose, onConfirm }) {
  const hasModifiers = item.modifiers && item.modifiers.length > 0;

  // Initialize selections: SINGLE → null, MULTIPLE → []
  const initSelections = () => {
    if (!hasModifiers) return {};
    return item.modifiers.reduce((acc, group) => {
      acc[group.name] = group.selection_type === 'MULTIPLE' ? [] : null;
      return acc;
    }, {});
  };

  const [selections, setSelections] = useState(initSelections);

  const toggleSingle = (groupName, mod) => {
    setSelections(prev => ({
      ...prev,
      [groupName]: prev[groupName]?.id === mod.id ? null : mod,
    }));
  };

  const toggleMultiple = (groupName, mod) => {
    setSelections(prev => {
      const current = prev[groupName] || [];
      const exists = current.find(m => m.id === mod.id);
      return {
        ...prev,
        [groupName]: exists ? current.filter(m => m.id !== mod.id) : [...current, mod],
      };
    });
  };

  const extraCost = Object.values(selections).reduce((sum, sel) => {
    if (!sel) return sum;
    if (Array.isArray(sel)) return sum + sel.reduce((s, m) => s + (m.price || 0), 0);
    return sum + (sel.price || 0);
  }, 0);

  const handleConfirm = () => {
    const selectedMods = [];
    for (const [groupName, sel] of Object.entries(selections)) {
      if (!sel) continue;
      if (Array.isArray(sel)) {
        sel.forEach(m => selectedMods.push({ group: groupName, name: m.name, price: m.price }));
      } else {
        selectedMods.push({ group: groupName, name: sel.name, price: sel.price });
      }
    }
    onConfirm(selectedMods, extraCost);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-float-lg w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex-1 mr-4">
            <h3 className="font-heading text-xl text-obsidian-roast">{item.name}</h3>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Modifier Groups */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {hasModifiers ? (
            item.modifiers.map(group => (
              <div key={group.name}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast">{group.name}</h4>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {group.selection_type === 'MULTIPLE' ? 'Choose any' : 'Choose one'}
                  </span>
                </div>
                <div className="space-y-2">
                  {group.modifiers.map(mod => {
                    const isMultiple = group.selection_type === 'MULTIPLE';
                    const isSelected = isMultiple
                      ? (selections[group.name] || []).some(m => m.id === mod.id)
                      : selections[group.name]?.id === mod.id;

                    return (
                      <button
                        key={mod.id}
                        onClick={() => isMultiple ? toggleMultiple(group.name, mod) : toggleSingle(group.name, mod)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? 'border-midnight-cherry bg-red-50'
                            : 'border-border hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full border-2 transition-all ${
                            isSelected ? 'bg-midnight-cherry border-midnight-cherry' : 'border-gray-300'
                          }`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                          <span className="font-body text-sm text-obsidian-roast">{mod.name}</span>
                        </div>
                        {mod.price > 0 && (
                          <span className="text-sm text-patina-mint font-semibold">+${mod.price.toFixed(2)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No customizations available.</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <button
            onClick={handleConfirm}
            className="btn-cherry chrome-hover w-full py-4 font-heading text-sm flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Add to Order — ${(item.price + extraCost).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MenuItemCard({ item }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const hasModifiers = item.modifiers && item.modifiers.length > 0;

  const handleAdd = (e) => {
    e?.stopPropagation();
    if (hasModifiers) {
      setShowModal(true);
    } else {
      addItem(item);
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    }
  };

  const handleModalConfirm = (selectedMods, extraCost) => {
    addItem({ ...item, price: item.price + extraCost, selectedModifiers: selectedMods });
    setShowModal(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <>
      {showModal && (
        <ModifierModal
          item={item}
          onClose={() => setShowModal(false)}
          onConfirm={handleModalConfirm}
        />
      )}

      <div className="group relative card-diner overflow-hidden">
        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-gray-100">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-amber-50 to-orange-100">
              {item.category === 'Burgers' ? '🍔' :
               item.category === 'Shakes' ? '🥤' :
               item.category === 'Sides' ? '🍟' :
               item.category === 'Drinks' ? '🧃' :
               item.category === 'Breakfast' ? '🍳' :
               item.category === 'Chicken' ? '🍗' : '⭐'}
            </div>
          )}

          {item.is_featured && (
            <div className="absolute top-3 left-3 bg-midnight-cherry text-white text-xs font-heading px-3 py-1 rounded-full flex items-center gap-1">
              <Zap size={10} /> Special
            </div>
          )}

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <button
              onClick={handleAdd}
              className={`btn-cherry chrome-hover px-5 py-2.5 text-sm flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 ${added ? 'bg-patina-mint' : ''}`}
            >
              <Plus size={16} />
              {added ? 'Added!' : hasModifiers ? 'Customize' : 'Quick Add'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-heading text-base text-obsidian-roast leading-tight">{item.name}</h3>
            <span className="text-midnight-cherry font-heading text-lg flex-shrink-0">${item.price.toFixed(2)}</span>
          </div>

          {item.description && (
            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-3">{item.description}</p>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {item.tags.slice(0, 3).map(tag => (
                <span key={tag} className="bg-patina-mint/10 text-patina-mint text-xs px-2 py-0.5 rounded-full font-semibold">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {item.calories && (
            <p className="text-xs text-muted-foreground mb-3">{item.calories} cal</p>
          )}

          {hasModifiers && (
            <p className="text-xs text-muted-foreground mb-2">
              {item.modifiers.length} customization{item.modifiers.length !== 1 ? 's' : ''} available
            </p>
          )}

          <button
            onClick={handleAdd}
            className={`w-full py-3 text-sm font-heading rounded-xl transition-all flex items-center justify-center gap-2 ${
              added
                ? 'bg-patina-mint text-white'
                : 'bg-muted text-obsidian-roast hover:bg-midnight-cherry hover:text-white'
            }`}
          >
            <Plus size={16} />
            {added ? 'Added to Cart!' : hasModifiers ? 'Customize & Add' : 'Add to Order'}
          </button>
        </div>
      </div>
    </>
  );
}