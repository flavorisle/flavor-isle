import React, { useState, useEffect } from 'react';
import { Plus, Zap, Heart, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/lib/AuthContext';
import ItemRatings from './ItemRatings';
import ModifierModal from './ModifierModal';

export default function MenuItemCard({ item, onFavoriteChange }) {
  const { addItem, orderingEnabled, orderingClosedMessage } = useCart();
  const { user } = useAuth();
  const [added, setAdded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);

  const hasModifiers = item.modifiers && item.modifiers.length > 0;
  const soldOut = item.is_available === false;

  useEffect(() => {
    if (!user?.id) return;
    base44.entities.Favorite.filter({ user_id: user.id, menu_item_id: item.id })
      .then(favs => setIsFavorite((favs || []).length > 0))
      .catch(() => {});
  }, [item.id, user?.id]);

  const toggleFavorite = async (e) => {
    e?.stopPropagation();
    if (!user?.id) return;
    const wasFavorite = isFavorite;
    // Optimistic: flip the heart instantly for a snappy, native feel.
    setIsFavorite(!wasFavorite);
    onFavoriteChange?.();
    setSavingFavorite(true);
    try {
      if (wasFavorite) {
        const favs = await base44.entities.Favorite.filter({ user_id: user.id, menu_item_id: item.id });
        if (favs?.length > 0) {
          await base44.entities.Favorite.delete(favs[0].id);
        }
      } else {
        await base44.entities.Favorite.create({
          user_id: user.id,
          menu_item_id: item.id,
          menu_item_name: item.name,
          menu_item_price: item.price,
          menu_item_image: item.image_url,
          menu_item_category: item.category,
        });
      }
    } catch (err) {
      // Revert the optimistic change if the DB operation fails.
      console.error('Error toggling favorite:', err);
      setIsFavorite(wasFavorite);
      onFavoriteChange?.();
    } finally {
      setSavingFavorite(false);
    }
  };

  const handleAdd = (e) => {
    e?.stopPropagation();
    if (!orderingEnabled) return;
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
        {/* Favorite button */}
        {user && (
          <button
            onClick={toggleFavorite}
            disabled={savingFavorite}
            className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/90 hover:bg-white transition-colors disabled:opacity-60"
          >
            <Heart size={18} className={isFavorite ? 'fill-midnight-cherry text-midnight-cherry' : 'text-gray-400'} />
          </button>
        )}

        {/* Image */}
        <div className="relative h-48 overflow-hidden bg-gray-100">
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.name}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${soldOut ? 'grayscale opacity-60' : ''}`}
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

          {item.is_fan_favorite && !soldOut && (
            <div className="absolute top-3 left-3 bg-smashie-yellow text-obsidian-roast text-xs font-heading px-3 py-1 rounded-full flex items-center gap-1 shadow-float">
              <Star size={10} className="fill-obsidian-roast" /> Fan Favorite
            </div>
          )}

          {!item.is_fan_favorite && item.is_featured && !soldOut && (
            <div className="absolute top-3 left-3 bg-midnight-cherry text-white text-xs font-heading px-3 py-1 rounded-full flex items-center gap-1">
              <Zap size={10} /> Special
            </div>
          )}

          {soldOut ? (
            <div className="absolute top-3 left-3 bg-obsidian-roast text-white text-xs font-heading px-3 py-1 rounded-full uppercase tracking-wider">
              Sold Out
            </div>
          ) : (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <button
                onClick={handleAdd}
                disabled={!orderingEnabled}
                className={`btn-cherry chrome-hover px-5 py-2.5 text-sm flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 disabled:opacity-60 disabled:cursor-not-allowed ${added ? 'bg-patina-mint' : ''}`}
                title={!orderingEnabled ? orderingClosedMessage : ''}
              >
                <Plus size={16} />
                {!orderingEnabled ? 'Closed' : added ? 'Added!' : hasModifiers ? 'Customize' : 'Quick Add'}
              </button>
            </div>
          )}
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

          <ItemRatings itemName={item.name} />

          {hasModifiers && (
            <p className="text-xs text-muted-foreground mb-2 mt-3">
              {item.modifiers.length} customization{item.modifiers.length !== 1 ? 's' : ''} available
            </p>
          )}

          <button
            onClick={handleAdd}
            disabled={soldOut || !orderingEnabled}
            className={`w-full py-3 text-sm font-heading rounded-xl transition-all flex items-center justify-center gap-2 ${
              (soldOut || !orderingEnabled)
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : added
                  ? 'bg-patina-mint text-white'
                  : 'bg-muted text-obsidian-roast hover:bg-midnight-cherry hover:text-white'
            }`}
          >
            <Plus size={16} />
            {soldOut ? 'Sold Out' : !orderingEnabled ? 'Ordering Closed' : added ? 'Added to Cart!' : hasModifiers ? 'Customize & Add' : 'Add to Order'}
          </button>
        </div>
      </div>
    </>
  );
}