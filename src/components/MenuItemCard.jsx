import React, { useState } from 'react';
import { Plus, Zap } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function MenuItemCard({ item }) {
  const { addItem, setIsCartOpen } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = (e) => {
    e.stopPropagation();
    addItem(item);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
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

        {/* Featured badge */}
        {item.is_featured && (
          <div className="absolute top-3 left-3 bg-midnight-cherry text-white text-xs font-heading px-3 py-1 rounded-full flex items-center gap-1">
            <Zap size={10} /> Special
          </div>
        )}

        {/* Quick add overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button
            onClick={handleAdd}
            className={`btn-cherry chrome-hover px-5 py-2.5 text-sm flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 ${added ? 'bg-patina-mint' : ''}`}
          >
            <Plus size={16} />
            {added ? 'Added!' : 'Quick Add'}
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

        {/* Tags */}
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

        <button
          onClick={handleAdd}
          className={`w-full py-3 text-sm font-heading rounded-xl transition-all flex items-center justify-center gap-2 ${
            added
              ? 'bg-patina-mint text-white'
              : 'bg-muted text-obsidian-roast hover:bg-midnight-cherry hover:text-white'
          }`}
        >
          <Plus size={16} />
          {added ? 'Added to Cart!' : 'Add to Order'}
        </button>
      </div>
    </div>
  );
}