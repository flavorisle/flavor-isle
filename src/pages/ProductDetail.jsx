import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Zap, Star, Clock, Sparkles, Heart } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { isHappyHourItem, getHappyHourItemPrice } from '@/lib/happyHour';
import { getComboData, COMBO_DISCOUNT } from '@/lib/comboData';
import { trackViewItem, trackSelectItem, foodItemToGa4 } from '@/lib/ga4Ecommerce';
import ModifierModal from '@/components/ModifierModal';
import ItemRatings from '@/components/ItemRatings';
import ShareItemButton from '@/components/ShareItemButton';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

const PLACEHOLDER_EMOJI = {
  Burgers: '🍔', Shakes: '🥤', Sides: '🍟', Drinks: '🧃',
  Breakfast: '🍳', Chicken: '🍗', Specials: '⭐',
};

// Full product detail page for a single menu item. Reached by clicking a
// menu card's photo — a real page (image, description, ratings, add-to-cart)
// rather than the quick customize modal. The modal is still used for the
// actual modifier selection when the customer taps "Customize & Add".
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, orderingEnabled, orderingClosedMessage, menuSetting } = useCart();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [added, setAdded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [openAsCombo, setOpenAsCombo] = useState(false);
  const [comboAddOn, setComboAddOn] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    base44.entities.MenuItem.get(id)
      .then((data) => {
        if (cancelled) return;
        if (!data || data.is_hidden) {
          setNotFound(true);
        } else {
          setItem(data);
          trackViewItem(foodItemToGa4(data), { item_list_id: 'product', item_list_name: 'Product Detail' });
        }
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    window.scrollTo({ top: 0 });
    return () => { cancelled = true; };
  }, [id]);

  const hasModifiers = item?.modifiers && item.modifiers.length > 0;
  const isBurger = item ? /burger/i.test(item.name) : false;
  const soldOut = item?.is_available === false;
  const isHappyHour = item ? isHappyHourItem(item, menuSetting) : false;
  const happyHourPrice = isHappyHour ? getHappyHourItemPrice(item, menuSetting) : null;
  const displayPrice = isHappyHour && happyHourPrice !== null ? happyHourPrice : item?.price;

  // Starting combo add-on for burgers (first side + vanilla shake − discount).
  useEffect(() => {
    if (!isBurger || soldOut || !item) return;
    let cancelled = false;
    getComboData().then((data) => {
      if (cancelled || !data) return;
      const side = data.sides[0];
      if (!side) return;
      setComboAddOn(+(side.price + data.shake.price - COMBO_DISCOUNT).toFixed(2));
    });
    return () => { cancelled = true; };
  }, [isBurger, soldOut, item]);

  useEffect(() => {
    if (!user?.id || !item) return;
    base44.entities.Favorite.filter({ user_id: user.id, menu_item_id: item.id })
      .then(favs => setIsFavorite((favs || []).length > 0))
      .catch(() => {});
  }, [item, user?.id]);

  const toggleFavorite = async (e) => {
    e?.stopPropagation();
    if (!user?.id || !item) return;
    const wasFavorite = isFavorite;
    setIsFavorite(!wasFavorite);
    setSavingFavorite(true);
    try {
      if (wasFavorite) {
        const favs = await base44.entities.Favorite.filter({ user_id: user.id, menu_item_id: item.id });
        if (favs?.length > 0) await base44.entities.Favorite.delete(favs[0].id);
      } else {
        await base44.entities.Favorite.create({
          user_id: user.id, menu_item_id: item.id, menu_item_name: item.name,
          menu_item_price: item.price, menu_item_image: item.image_url, menu_item_category: item.category,
        });
      }
    } catch (err) {
      setIsFavorite(wasFavorite);
    } finally {
      setSavingFavorite(false);
    }
  };

  const handleAdd = () => {
    if (!orderingEnabled || soldOut) return;
    if (hasModifiers) {
      trackSelectItem(foodItemToGa4(item));
      setShowModal(true);
    } else {
      addItem(item);
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    }
  };

  const handleMakeCombo = () => {
    if (!orderingEnabled || soldOut) return;
    trackSelectItem(foodItemToGa4(item));
    setOpenAsCombo(true);
    setShowModal(true);
  };

  const handleModalConfirm = (selectedMods, extraCost, deluxeLabel, deluxeToppings, comboItems) => {
    addItem({
      ...item,
      price: item.price + extraCost,
      selectedModifiers: selectedMods,
      deluxeLabel: deluxeLabel || undefined,
      deluxeToppings: deluxeToppings || [],
    });
    if (comboItems && comboItems.length > 0) comboItems.forEach(ci => addItem(ci));
    setShowModal(false);
    setOpenAsCombo(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const addLabel = soldOut ? 'Sold Out' : !orderingEnabled ? 'Ordering Closed' : added ? 'Added to Cart!' : hasModifiers ? 'Customize & Add' : 'Add to Order';
  const addBtnClass = (soldOut || !orderingEnabled)
    ? 'bg-muted text-muted-foreground cursor-not-allowed'
    : added ? 'bg-patina-mint text-white' : 'btn-cherry';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <CartDrawer />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-sm font-heading text-patina-mint hover:text-midnight-cherry transition-colors mb-4 tap-44"
        >
          <ArrowLeft size={16} /> Back to menu
        </button>

        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
          </div>
        )}

        {notFound && (
          <div className="text-center py-24">
            <p className="font-heading text-2xl text-obsidian-roast mb-2">Item not found</p>
            <p className="text-muted-foreground mb-6">This item may have been removed from the menu.</p>
            <Link to="/menu" className="btn-cherry px-6 py-3 text-sm">Browse the menu</Link>
          </div>
        )}

        {item && !loading && (
          <article className="card-diner overflow-hidden">
            {/* Hero image */}
            <div className="relative h-72 sm:h-96 bg-gray-100">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className={`w-full h-full object-cover ${soldOut ? 'grayscale opacity-60' : ''}`} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl bg-gradient-to-br from-amber-50 to-orange-100">
                  {PLACEHOLDER_EMOJI[item.category] || '⭐'}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />

              {/* Badges */}
              {item.is_fan_favorite && !soldOut && (
                <div className="absolute top-3 left-3 bg-smashie-yellow text-[#003366] text-xs font-heading px-3 py-1 rounded-full flex items-center gap-1 shadow-float">
                  <Star size={10} className="fill-obsidian-roast" /> Fan Favorite
                </div>
              )}
              {!item.is_fan_favorite && item.is_featured && !soldOut && (
                <div className="absolute top-3 left-3 bg-midnight-cherry text-white text-xs font-heading px-3 py-1 rounded-full flex items-center gap-1">
                  <Zap size={10} /> Special
                </div>
              )}
              {soldOut && (
                <div className="absolute top-3 left-3 bg-obsidian-roast text-white text-xs font-heading px-3 py-1 rounded-full uppercase tracking-wider">
                  Sold Out
                </div>
              )}
              {isHappyHour && !soldOut && (
                <div className="absolute left-3 bg-midnight-cherry text-white text-xs font-heading px-3 py-1 rounded-full flex items-center gap-1" style={{ top: (item.is_fan_favorite || item.is_featured) ? '2.75rem' : '0.75rem' }}>
                  <Clock size={10} /> Happy Hour · Online
                </div>
              )}

              {/* Favorite + share */}
              {user && (
                <button
                  onClick={toggleFavorite}
                  disabled={savingFavorite}
                  className="absolute top-3 right-14 p-2 rounded-full bg-white/90 hover:bg-white transition-colors disabled:opacity-60"
                >
                  <Heart size={18} className={isFavorite ? 'fill-midnight-cherry text-midnight-cherry' : 'text-gray-400'} />
                </button>
              )}
              <ShareItemButton itemId={item.id} variant="icon" ariaLabel={`Share ${item.name}`} className="absolute top-3 right-3" />
            </div>

            {/* Details */}
            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h1 className="font-heading text-2xl sm:text-3xl text-obsidian-roast leading-tight">{item.name}</h1>
                {isHappyHour && happyHourPrice !== null ? (
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-sm line-through text-muted-foreground">${item.price.toFixed(2)}</span>
                    <span className="font-heading text-2xl text-midnight-cherry">${happyHourPrice.toFixed(2)}</span>
                  </div>
                ) : (
                  <span className="font-heading text-2xl text-midnight-cherry flex-shrink-0">${item.price.toFixed(2)}</span>
                )}
              </div>

              {item.description && (
                <p className="text-base leading-relaxed text-muted-foreground mb-4">{item.description}</p>
              )}

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {item.tags.map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-semibold bg-patina-mint/10 text-patina-mint">{tag}</span>
                  ))}
                </div>
              )}

              {item.calories && (
                <p className="text-sm text-muted-foreground mb-4">{item.calories} cal</p>
              )}

              {hasModifiers && (
                <p className="text-sm text-muted-foreground mb-4">
                  {item.modifiers.length} customization{item.modifiers.length !== 1 ? 's' : ''} available — tap below to build your perfect order.
                </p>
              )}

              {/* Combo upsell (burgers) */}
              {isBurger && !soldOut && orderingEnabled && (
                <button
                  onClick={handleMakeCombo}
                  className="w-full mb-3 py-3 text-sm font-heading rounded-xl flex items-center justify-center gap-2 border bg-smashie-yellow/15 text-midnight-cherry border-smashie-yellow/50 hover:bg-smashie-yellow/30 transition-all"
                >
                  <Sparkles size={16} />
                  Make it a Combo
                  {comboAddOn !== null && (
                    <span className="ml-1 text-xs font-body text-midnight-cherry/70">+${comboAddOn.toFixed(2)}</span>
                  )}
                </button>
              )}

              {/* Add to order */}
              <button
                onClick={handleAdd}
                disabled={soldOut || !orderingEnabled}
                className={`w-full py-4 text-base font-heading rounded-xl transition-all flex items-center justify-center gap-2 ${addBtnClass}`}
              >
                <Plus size={18} />
                {addLabel}
                {!soldOut && orderingEnabled && !added && (
                  <span className="ml-1 opacity-70 font-body">· ${displayPrice.toFixed(2)}</span>
                )}
              </button>
              {!orderingEnabled && orderingClosedMessage && (
                <p className="text-xs text-center text-muted-foreground mt-2">{orderingClosedMessage}</p>
              )}

              {/* Ratings + reviews */}
              <div className="mt-6 pt-5 border-t border-border">
                <h2 className="font-heading text-lg text-obsidian-roast mb-1">Customer reviews</h2>
                <ItemRatings item={item} />
              </div>
            </div>
          </article>
        )}
      </main>

      <Footer />

      {showModal && item && (
        <ModifierModal
          item={item}
          autoCombo={openAsCombo}
          onClose={() => { setShowModal(false); setOpenAsCombo(false); }}
          onConfirm={handleModalConfirm}
        />
      )}
    </div>
  );
}