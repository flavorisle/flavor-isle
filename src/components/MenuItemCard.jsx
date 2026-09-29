import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Zap, Heart, Star, Clock } from 'lucide-react';
import { isHappyHourItem, getHappyHourItemPrice } from '@/lib/happyHour';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/lib/AuthContext';
import ItemRatings from './ItemRatings';
import ModifierModal from './ModifierModal';
import { withShakeFlavorLevel } from './ShakeFlavorControl';
import ShareItemButton from './ShareItemButton';
import { trackSelectItem, foodItemToGa4 } from '@/lib/ga4Ecommerce';
import { productPath } from '@/lib/productSlug';

const PLACEHOLDER_EMOJI = {
  Burgers: '🍔', Shakes: '🥤', Sides: '🍟', Drinks: '🧃',
  Breakfast: '🍳', Chicken: '🍗', Specials: '⭐',
};

export default function MenuItemCard({ item, onFavoriteChange, autoOpen }) {
  const { addItem, orderingEnabled, orderingClosedMessage, menuSetting } = useCart();
  const isHappyHour = isHappyHourItem(item, menuSetting);
  const happyHourPrice = isHappyHour ? getHappyHourItemPrice(item, menuSetting) : null;
  const { user } = useAuth();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);

  // Share-link focus: when this card is the target of a /menu?item=<id> link,
  // open the customization/detail modal automatically (without adding to cart).
  useEffect(() => {
    setShowModal(!!autoOpen);
  }, [autoOpen]);

  const hasModifiers = item.modifiers && item.modifiers.length > 0;
  const soldOut = item.is_available === false;
  const position = item.image_position || 'background';

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
      console.error('Error toggling favorite:', err);
      setIsFavorite(wasFavorite);
      onFavoriteChange?.();
    } finally {
      setSavingFavorite(false);
    }
  };

  // Photo click opens the item's full product detail page — a real page with
  // the hero image, description, reviews, and add-to-cart — rather than the
  // quick customize modal. Fires the same GA4 select-item event used by the
  // add/combo actions. Sold-out items still open the page (viewing allowed).
  const handlePhotoClick = (e) => {
    e?.stopPropagation();
    trackSelectItem(foodItemToGa4(item));
    navigate(productPath(item));
  };

  const handleAdd = (e) => {
    e?.stopPropagation();
    if (!orderingEnabled) return;
    if (hasModifiers) {
      trackSelectItem(foodItemToGa4(item));
      setShowModal(true);
    } else {
      addItem(item);
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    }
  };

  const handleModalConfirm = (selectedMods, extraCost, deluxeLabel, deluxeToppings, comboItems, allergyNote, coreLevel) => {
    addItem({
      ...item,
      name: withShakeFlavorLevel(item.name, coreLevel),
      flavorLevel: coreLevel || undefined,
      price: item.price + extraCost,
      selectedModifiers: selectedMods,
      deluxeLabel: deluxeLabel || undefined,
      deluxeToppings: deluxeToppings || [],
      allergyNote: allergyNote || undefined,
    });
    if (comboItems && comboItems.length > 0) {
      comboItems.forEach(ci => addItem(ci));
    }
    setShowModal(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  // ── Reusable pieces ──

  // Favorite sits just left of the share button so both fit in the top-right.
  const favoriteBtn = user && (
    <button
      onClick={toggleFavorite}
      disabled={savingFavorite}
      className="absolute top-3 right-12 z-20 p-2 rounded-full bg-white/90 hover:bg-white transition-colors disabled:opacity-60"
    >
      <Heart size={18} className={isFavorite ? 'fill-midnight-cherry text-midnight-cherry' : 'text-gray-400'} />
    </button>
  );

  // Share action — native share sheet when available, copy-link fallback.
  // Stops propagation so it never triggers the card's add/customize action.
  const shareBtn = (
    <ShareItemButton
      itemId={item.id}
      variant="icon"
      ariaLabel={`Share ${item.name}`}
      className="absolute top-3 right-3 z-20"
    />
  );

  const badges = (
    <>
      {item.is_fan_favorite && !soldOut && (
        <div className="absolute top-3 left-3 bg-smashie-yellow text-[#003366] text-xs font-heading px-3 py-1 rounded-full flex items-center gap-1 shadow-float z-10">
          <Star size={10} className="fill-obsidian-roast" /> Fan Favorite
        </div>
      )}
      {!item.is_fan_favorite && item.is_featured && !soldOut && (
        <div className="absolute top-3 left-3 bg-midnight-cherry text-white text-xs font-heading px-3 py-1 rounded-full flex items-center gap-1 z-10">
          <Zap size={10} /> Special
        </div>
      )}
      {soldOut && (
        <div className="absolute top-3 left-3 bg-obsidian-roast text-white text-xs font-heading px-3 py-1 rounded-full uppercase tracking-wider z-10">
          Sold Out
        </div>
      )}
      {isHappyHour && !soldOut && (
        <div
          className="absolute left-3 bg-midnight-cherry text-white text-xs font-heading px-3 py-1 rounded-full flex items-center gap-1 z-10"
          style={{ top: (item.is_fan_favorite || item.is_featured) ? '2.75rem' : '0.75rem' }}
        >
          <Clock size={10} /> Happy Hour · Online
        </div>
      )}
    </>
  );

  const photo = item.image_url ? (
    <img
      src={item.image_url}
      alt={item.name}
      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${soldOut ? 'grayscale opacity-60' : ''}`}
    />
  ) : (
    <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-amber-50 to-orange-100">
      {PLACEHOLDER_EMOJI[item.category] || '⭐'}
    </div>
  );

  // Hover quick-add overlay (used on top / left / right layouts)
  const hoverAdd = !soldOut && (
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
  );

  // Text content block. `light` flips colors for the background layout.
  const renderContent = (light = false, { showRatings = true } = {}) => {
    const addLabel = soldOut ? 'Sold Out' : !orderingEnabled ? 'Ordering Closed' : added ? 'Added to Bag!' : hasModifiers ? 'Customize & Add' : 'Add to Order';
    const addBtnClass = (soldOut || !orderingEnabled)
      ? 'bg-muted text-muted-foreground cursor-not-allowed'
      : added
        ? 'bg-patina-mint text-white'
        : light
          ? 'bg-white/90 text-[#003366] hover:bg-white'
          : 'bg-muted text-obsidian-roast hover:bg-midnight-cherry hover:text-white';
    return (
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className={`font-heading text-base leading-tight ${light ? 'text-white' : 'text-obsidian-roast'}`}>{item.name}</h3>
          {isHappyHour && happyHourPrice !== null ? (
            <div className="flex flex-col items-end flex-shrink-0">
              <span className={`text-xs line-through ${light ? 'text-white/55' : 'text-muted-foreground'}`}>${item.price.toFixed(2)}</span>
              <span className={`font-heading text-lg leading-none ${light ? 'text-white' : 'text-midnight-cherry'}`}>${happyHourPrice.toFixed(2)}</span>
            </div>
          ) : (
            <span className={`font-heading text-lg flex-shrink-0 ${light ? 'text-white' : 'text-midnight-cherry'}`}>${item.price.toFixed(2)}</span>
          )}
        </div>
        {item.description && (
          <p className={`text-sm leading-relaxed line-clamp-2 mb-3 ${light ? 'text-white/90' : 'text-muted-foreground'}`}>{item.description}</p>
        )}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 3).map(tag => (
              <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${light ? 'bg-white/20 text-white' : 'bg-patina-mint/10 text-patina-mint'}`}>{tag}</span>
            ))}
          </div>
        )}
        {item.calories && (
          <p className={`text-xs mb-3 ${light ? 'text-white/85' : 'text-muted-foreground'}`}>{item.calories} cal</p>
        )}
        {showRatings && <ItemRatings item={item} />}
        {hasModifiers && (
          <p className={`text-xs mb-2 mt-3 ${light ? 'text-white/85' : 'text-muted-foreground'}`}>
            {item.modifiers.length} customization{item.modifiers.length !== 1 ? 's' : ''} available
          </p>
        )}
        <button
          onClick={handleAdd}
          disabled={soldOut || !orderingEnabled}
          className={`w-full py-3 text-sm font-heading rounded-xl transition-all flex items-center justify-center gap-2 pointer-events-auto ${addBtnClass}`}
        >
          <Plus size={16} />
          {addLabel}
          {!soldOut && orderingEnabled && !added && (
            <span className="ml-1 opacity-90 font-body">
              · ${(isHappyHour && happyHourPrice !== null ? happyHourPrice : item.price).toFixed(2)}
            </span>
          )}
        </button>
      </div>
    );
  };

  const modal = showModal && (
    <ModifierModal
      item={item}
      autoCombo={false}
      onClose={() => { setShowModal(false); }}
      onConfirm={handleModalConfirm}
    />
  );

  // ── Layouts ──

  if (position === 'none') {
    return (
      <>
        {modal}
        <div className="group relative card-diner">
          {favoriteBtn}
          {shareBtn}
          {badges}
          {renderContent(false)}
        </div>
      </>
    );
  }

  if (position === 'background') {
    return (
      <>
        {modal}
        <div className="group relative card-diner overflow-hidden min-h-[240px] flex flex-col justify-end">
          <div className="absolute inset-0">
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className={`w-full h-full object-cover ${soldOut ? 'grayscale opacity-60' : ''}`} />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-obsidian-roast to-midnight-cherry" />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10 pointer-events-none" />
          {/* Clickable photo layer — sits above the image/gradient but below
              badges (z-10) and the content block so only the photo area opens
              the product page, not the title or action buttons. */}
          <button
            type="button"
            onClick={handlePhotoClick}
            aria-label={`View ${item.name}`}
            className="absolute inset-0 z-0 cursor-pointer"
          />
          {favoriteBtn}
          {shareBtn}
          {badges}
          <div className="relative z-10 pointer-events-none">
            {renderContent(true, { showRatings: false })}
          </div>
        </div>
      </>
    );
  }

  if (position === 'left' || position === 'right') {
    const imageBlock = (
      <div
        onClick={handlePhotoClick}
        role="button"
        tabIndex={0}
        aria-label={`View ${item.name}`}
        className="relative w-full h-40 sm:w-40 sm:h-auto overflow-hidden bg-gray-100 flex-shrink-0 cursor-pointer"
      >
        {photo}
        {badges}
        {hoverAdd}
      </div>
    );
    return (
      <>
        {modal}
        <div className="group relative card-diner overflow-hidden flex flex-col sm:flex-row">
          {position === 'left' && imageBlock}
          <div className="relative flex-1 min-w-0">
            {favoriteBtn}
            {shareBtn}
            {renderContent(false)}
          </div>
          {position === 'right' && imageBlock}
        </div>
      </>
    );
  }

  // default: top
  return (
    <>
      {modal}
      <div className="group relative card-diner overflow-hidden">
        {favoriteBtn}
        {shareBtn}
        <div
          onClick={handlePhotoClick}
          role="button"
          tabIndex={0}
          aria-label={`View ${item.name}`}
          className="relative h-48 overflow-hidden bg-gray-100 cursor-pointer"
        >
          {photo}
          {badges}
          {hoverAdd}
        </div>
        {renderContent(false)}
      </div>
    </>
  );
}