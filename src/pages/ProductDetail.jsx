import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Zap, Star, Clock, Sparkles, Heart } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { isHappyHourItem, getHappyHourItemPrice } from '@/lib/happyHour';
import { trackViewItem, trackSelectItem, foodItemToGa4 } from '@/lib/ga4Ecommerce';
import ProductModifierPanel from '@/components/ProductModifierPanel';
import ItemRatings from '@/components/ItemRatings';
import ShareItemButton from '@/components/ShareItemButton';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

const PLACEHOLDER_EMOJI = {
  Burgers: '🍔', Shakes: '🥤', Sides: '🍟', Drinks: '🧃',
  Breakfast: '🍳', Chicken: '🍗', Specials: '⭐',
};

// Two-column product detail: sticky summary (title, price, image, combo CTA,
// quantity, Add to Bag) on the left; inline modifier panel + reviews on the
// right. All modifier, combo, deluxe, and happy hour logic lives in the
// ProductModifierPanel — this page owns layout, quantity, and the add flow.
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem, orderingEnabled, orderingClosedMessage, menuSetting } = useCart();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [panelState, setPanelState] = useState({
    total: 0, isCombo: false, comboReady: false, comboAddOn: 0,
    comboDrinkType: 'shake', comboStep: 0, deluxeLabel: null, ready: true,
  });
  const panelRef = useRef(null);

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
  const showPanel = hasModifiers || isBurger;

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

  const handlePanelConfirm = (selectedMods, extraCost, deluxeLabel, deluxeToppings, comboItems) => {
    const baseItem = {
      ...item,
      price: item.price + extraCost,
      selectedModifiers: selectedMods,
      deluxeLabel: deluxeLabel || undefined,
      deluxeToppings: deluxeToppings || [],
    };
    for (let i = 0; i < quantity; i++) {
      addItem(baseItem);
      if (comboItems && comboItems.length > 0) comboItems.forEach(ci => addItem(ci));
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const handleAddToBag = () => {
    if (!orderingEnabled || soldOut) return;
    if (showPanel) {
      if (!panelRef.current?.isReady()) return;
      trackSelectItem(foodItemToGa4(item));
      panelRef.current.confirm();
    } else {
      trackSelectItem(foodItemToGa4(item));
      for (let i = 0; i < quantity; i++) addItem(item);
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    }
  };

  const handleMakeCombo = () => {
    if (!orderingEnabled || soldOut) return;
    trackSelectItem(foodItemToGa4(item));
    panelRef.current?.setCombo(true);
    // Scroll the right column into view on mobile so the combo builder is visible
    if (window.innerWidth < 1024) {
      setTimeout(() => {
        document.getElementById('product-modifiers')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const comboNotReady = showPanel && panelState.isCombo && !panelState.comboReady;
  const canAdd = !soldOut && orderingEnabled && !comboNotReady;
  const comboHint = comboNotReady
    ? panelState.comboStep < 2
      ? 'Pick a side to start your combo'
      : panelState.comboStep < 4
        ? 'Pick your drink to finish your combo'
        : `Pick a ${panelState.comboDrinkType === 'shake' ? 'shake flavor' : 'soda'}`
    : null;
  const addLabel = soldOut
    ? 'Sold Out'
    : !orderingEnabled
      ? 'Ordering Closed'
      : added
        ? 'Added to Cart!'
        : comboHint
          ? comboHint
          : 'Add to Bag';
  const addBtnClass = (soldOut || !orderingEnabled)
    ? 'bg-muted text-muted-foreground cursor-not-allowed'
    : added
      ? 'bg-patina-mint text-white'
      : comboNotReady
        ? 'btn-cherry opacity-50 cursor-not-allowed'
        : 'btn-cherry chrome-hover';
  const liveTotal = showPanel ? panelState.total * quantity : (displayPrice || 0) * quantity;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <CartDrawer />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
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
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Left column — sticky product summary */}
            <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
              {/* Title + price + calories */}
              <div>
                <h1 className="font-heading text-3xl sm:text-4xl text-obsidian-roast leading-tight mb-2">{item.name}</h1>
                <div className="flex items-center gap-3 flex-wrap">
                  {isHappyHour && happyHourPrice !== null ? (
                    <>
                      <span className="text-base line-through text-muted-foreground">${item.price.toFixed(2)}</span>
                      <span className="font-heading text-2xl text-midnight-cherry">${happyHourPrice.toFixed(2)}</span>
                    </>
                  ) : (
                    <span className="font-heading text-2xl text-midnight-cherry">${item.price.toFixed(2)}</span>
                  )}
                  {item.calories && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-sm text-muted-foreground">{item.calories} cal</span>
                    </>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {item.is_fan_favorite && !soldOut && (
                  <span className="bg-smashie-yellow text-[#003366] text-xs font-heading px-3 py-1 rounded-full flex items-center gap-1">
                    <Star size={10} className="fill-obsidian-roast" /> Fan Favorite
                  </span>
                )}
                {!item.is_fan_favorite && item.is_featured && !soldOut && (
                  <span className="bg-midnight-cherry text-white text-xs font-heading px-3 py-1 rounded-full flex items-center gap-1">
                    <Zap size={10} /> Special
                  </span>
                )}
                {isHappyHour && !soldOut && (
                  <span className="bg-midnight-cherry text-white text-xs font-heading px-3 py-1 rounded-full flex items-center gap-1">
                    <Clock size={10} /> Happy Hour · Online
                  </span>
                )}
                {soldOut && (
                  <span className="bg-obsidian-roast text-white text-xs font-heading px-3 py-1 rounded-full uppercase tracking-wider">
                    Sold Out
                  </span>
                )}
              </div>

              {/* Large product image */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-float">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className={`w-full h-full object-cover ${soldOut ? 'grayscale opacity-60' : ''}`} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl bg-gradient-to-br from-amber-50 to-orange-100">
                    {PLACEHOLDER_EMOJI[item.category] || '⭐'}
                  </div>
                )}
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

              {/* Description */}
              {item.description && (
                <p className="text-base leading-relaxed text-muted-foreground">{item.description}</p>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-semibold bg-patina-mint/10 text-patina-mint">{tag}</span>
                  ))}
                </div>
              )}

              {/* Make it a Combo (burgers) */}
              {isBurger && !soldOut && orderingEnabled && (
                <button
                  onClick={handleMakeCombo}
                  className="w-full py-3 text-sm font-heading rounded-xl flex items-center justify-center gap-2 border bg-smashie-yellow/15 text-midnight-cherry border-smashie-yellow/50 hover:bg-smashie-yellow/30 transition-all"
                >
                  <Sparkles size={16} />
                  Make it a Combo
                  {panelState.comboAddOn > 0 && (
                    <span className="ml-1 text-xs font-body text-midnight-cherry/70">+${panelState.comboAddOn.toFixed(2)}</span>
                  )}
                </button>
              )}

              {/* Quantity selector */}
              {!soldOut && orderingEnabled && (
                <div className="flex items-center gap-3">
                  <span className="font-heading text-sm text-obsidian-roast uppercase tracking-widest">Qty</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(q => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-midnight-cherry hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="font-heading text-lg text-obsidian-roast w-8 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity(q => Math.min(20, q + 1))}
                      disabled={quantity >= 20}
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-midnight-cherry hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Add to Bag */}
              <button
                onClick={handleAddToBag}
                disabled={!canAdd}
                className={`w-full py-4 text-base font-heading rounded-xl transition-all flex items-center justify-center gap-2 ${addBtnClass}`}
              >
                <Plus size={18} />
                {addLabel}
                {!soldOut && orderingEnabled && !added && !comboNotReady && (
                  <span className="ml-1 opacity-70 font-body">· ${liveTotal.toFixed(2)}</span>
                )}
              </button>
              {!orderingEnabled && orderingClosedMessage && (
                <p className="text-xs text-center text-muted-foreground">{orderingClosedMessage}</p>
              )}
            </div>

            {/* Right column — modifiers + reviews */}
            <div id="product-modifiers" className="space-y-8">
              {showPanel ? (
                <ProductModifierPanel
                  ref={panelRef}
                  item={item}
                  onConfirm={handlePanelConfirm}
                  onStateChange={setPanelState}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="font-body">No customizations available for this item.</p>
                </div>
              )}

              {/* Reviews */}
              <div className="pt-6 border-t border-border">
                <h2 className="font-heading text-lg text-obsidian-roast mb-1">Customer reviews</h2>
                <ItemRatings item={item} />
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}