import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Zap, Star, Clock, Heart } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { isHappyHourItem, getHappyHourItemPrice } from '@/lib/happyHour';
import { trackViewItem, trackSelectItem, foodItemToGa4 } from '@/lib/ga4Ecommerce';
import ProductModifierPanel from '@/components/ProductModifierPanel';
import ShakeFlavorControl, { withShakeFlavorLevel } from '@/components/ShakeFlavorControl';
import { isShakeItem } from '@/components/AllergyNote';
import ProductSuggestions from '@/components/ProductSuggestions';
import ItemRatings from '@/components/ItemRatings';
import ShareItemButton from '@/components/ShareItemButton';
import { findMenuItem, productSlug, productPath } from '@/lib/productSlug';
import ItemBuildSummary from '@/components/ItemBuildSummary';
import ItemSelectionSummary from '@/components/ItemSelectionSummary';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import PhotoTile from '@/components/ui/PhotoTile';
import PriceChip from '@/components/ui/PriceChip';
import ProductStructuredData from '@/components/schema/ProductStructuredData';
import { isSaltQuestionItem, saltNoteText } from '@/lib/sideSalt';
import SideSaltChoice from '@/components/SideSaltChoice';

const PLACEHOLDER_EMOJI = {
  Burgers: '🍔', Shakes: '🥤', Sides: '🍟', Drinks: '🧃',
  Breakfast: '🍳', Chicken: '🍗', Specials: '⭐',
};

// Two-column product detail: sticky summary (title, price, image, quantity, and
// Add to Bag) on the left; the inline modifier panel and reviews on the right.
// Modifier (with the switch-gated Deluxe presets) and Happy Hour logic lives in
// ProductModifierPanel; this page owns layout, quantity, and the add flow.
export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem, removeItem, cartItems, orderingEnabled, orderingClosedMessage, menuSetting } = useCart();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [added, setAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [panelState, setPanelState] = useState({ total: 0, extraCost: 0, deluxeLabel: null, burgerModsLabel: null, ready: true, ruleMissing: 0, selectedIds: [], nestedSelections: {} });
  const panelRef = useRef(null);
  // Fries and tots are cooked unsalted; the question is asked here on the page,
  // right above the quantity, instead of inside the modifier panel.
  const [saltChoice, setSaltChoice] = useState(null);
  // A shake's included flavor amount — shown above the description, and handed
  // to the panel so its price and the bag line carry the same choice.
  const [coreLevel, setCoreLevel] = useState(null);

  // The "What's on it" chips toggle the customization panel's own selection
  // state, so chips, list, price, and cart all stay in agreement.
  const toggleChip = (groupName, mod) => panelRef.current?.toggleModifier(groupName, mod);
  const setChipNested = (modId, nested) => panelRef.current?.setNested(modId, nested);
  const setChipIceSize = (mod, level) => panelRef.current?.selectIceSize(mod, level);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    findMenuItem(slug)
      .then((data) => {
        if (cancelled) return;
        if (!data || data.is_hidden) {
          setNotFound(true);
        } else {
          setItem(data);
          trackViewItem(foodItemToGa4(data), { item_list_id: 'product', item_list_name: 'Product Detail' });
          // Keep the address bar on the item's name URL — older id-based links
          // (cart edit, previously shared ids) resolve to the same page.
          const canonical = productSlug(data);
          if (canonical && canonical !== slug) navigate(`/product/${canonical}`, { replace: true, state: location.state });
        }
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    window.scrollTo({ top: 0 });
    return () => { cancelled = true; };
  }, [slug, navigate]);

  // The bag line being edited, when the cart's Edit button opened this page.
  // Every item opens this way — the modifier panel restores the choices the
  // line already carries, so a wrong topping is unselected here instead of the
  // line being deleted and ordered again.
  const editingLine = item
    ? cartItems.find(line => line.id === location.state?.editCartLineId && (line.productId || line.id.split('__')[0]) === item.id)
    : null;
  // A past order line opened from the menu's Order Again cards: the panel comes
  // up with that build already in place, so the item can be ordered as it was or
  // changed first.
  const reorderItem = editingLine ? null : (location.state?.reorderItem || null);
  useEffect(() => {
    if (editingLine) setQuantity(editingLine.quantity);
    else if (reorderItem?.quantity) setQuantity(Math.min(20, Math.max(1, reorderItem.quantity)));
  }, [editingLine?.id, reorderItem?.quantity]);
  // A bag line being edited, or a reorder, reopens with its salt answer set.
  useEffect(() => {
    const note = (editingLine || reorderItem)?.saltNote || '';
    if (!note) return;
    setSaltChoice(/no salt/i.test(note) ? 'no' : 'yes');
  }, [editingLine?.id, reorderItem?.saltNote]);
  // Reopening a bag line or a past order brings its flavor amount back with it.
  useEffect(() => {
    setCoreLevel((editingLine || reorderItem)?.flavorLevel || null);
  }, [editingLine?.id, reorderItem?.flavorLevel]);
  const shakeItem = item ? isShakeItem(item) : false;
  const hasModifiers = item?.modifiers && item.modifiers.length > 0;
  const isBurger = item ? /burger/i.test(item.name) : false;
  // Fries and tots ask the required salt question even with zero modifiers, so
  // they always open the panel.
  const needsSalt = item ? isSaltQuestionItem(item) : false;
  const soldOut = item?.is_available === false;
  const imageUrl = item?.image_url_opt || item?.image_url;
  const isHappyHour = item ? isHappyHourItem(item, menuSetting) : false;
  const happyHourPrice = isHappyHour ? getHappyHourItemPrice(item, menuSetting) : null;
  const displayPrice = isHappyHour && happyHourPrice !== null ? happyHourPrice : item?.price;
  const showPanel = hasModifiers || isBurger || needsSalt;

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
          menu_item_price: item.price, menu_item_image: imageUrl, menu_item_category: item.category,
        });
      }
    } catch (err) {
      setIsFavorite(wasFavorite);
    } finally {
      setSavingFavorite(false);
    }
  };

  const flashAdded = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const handlePanelConfirm = (selectedMods, extraCost, deluxeLabel, deluxeToppings, coreLevel, saltNote) => {
    const baseItem = {
      ...item,
      name: withShakeFlavorLevel(item.name, coreLevel),
      flavorLevel: coreLevel || undefined,
      productId: item.id,
      price: item.price + extraCost,
      selectedModifiers: selectedMods,
      deluxeLabel: deluxeLabel || undefined,
      deluxeToppings: deluxeToppings || [],
      saltNote: saltNoteText(saltNote) || undefined,
    };
    if (editingLine) removeItem(editingLine.id);
    for (let i = 0; i < quantity; i++) addItem(baseItem);
    if (editingLine) navigate(location.pathname, { replace: true, state: null });
    flashAdded();
  };

  const handleAddToBag = () => {
    if (!orderingEnabled || soldOut) return;
    if (showPanel) {
      if (!panelRef.current?.isReady()) return;
      trackSelectItem(foodItemToGa4(item));
      panelRef.current.confirm();
    } else {
      trackSelectItem(foodItemToGa4(item));
      // An edited line with nothing to customize is replaced, not added again —
      // the two would otherwise merge and double the quantity.
      if (editingLine) removeItem(editingLine.id);
      for (let i = 0; i < quantity; i++) addItem({ ...item, productId: item.id });
      flashAdded();
    }
  };

  // A needed salt answer blocks the add, exactly as the modal does.
  const saltMissing = needsSalt && !saltChoice && !soldOut && orderingEnabled;
  // Square's modifier rules: the panel reports how many picks a group is still
  // short of, and that shortfall shuts the bag exactly as the salt answer does.
  const ruleMissing = showPanel ? (panelState.ruleMissing || 0) : 0;
  const canAdd = !soldOut && orderingEnabled && !saltMissing && ruleMissing === 0;
  const addLabel = soldOut
    ? 'Sold Out'
    : !orderingEnabled
      ? 'Ordering Closed'
      : added
        ? editingLine ? 'Bag Updated!' : 'Added to Bag!'
        : ruleMissing > 0
          ? `Choose ${ruleMissing} more to continue`
          : saltMissing
            ? 'Choose a salt option'
            : editingLine ? 'Update Bag' : 'Add to Bag';
  const addBtnClass = (soldOut || !orderingEnabled)
    ? 'bg-muted text-muted-foreground cursor-not-allowed'
    : added
      ? 'bg-patina-mint text-white'
      : 'btn-cherry chrome-hover';
  const liveTotal = showPanel
    ? panelState.total * quantity
    : (displayPrice || 0) * quantity;

  return (
    <div className="min-h-screen flex flex-col">
      <ProductStructuredData item={item} />
      <Navbar />
      <CartDrawer />

      <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6">
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
            <div className="lg:sticky lg:top-24 lg:self-start space-y-4 cv-rise">
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
                {imageUrl ? (
                  <PhotoTile
                    imageUrl={imageUrl}
                    alt={item.name}
                    size="lg"
                    className={`rounded-none ${soldOut ? 'grayscale opacity-60' : ''}`}
                    imgStyle={{ viewTransitionName: 'product-photo' }}
                  />
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
                <ShareItemButton
                  itemId={item.id}
                  url={`${window.location.origin}${productPath(item)}`}
                  variant="icon"
                  ariaLabel={`Share ${item.name}`}
                  className="absolute top-3 right-3"
                />
              </div>

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 rounded-full font-semibold bg-patina-mint/10 text-patina-mint">{tag}</span>
                  ))}
                </div>
              )}

              {/* A shake's flavor amount sits above the description, not with
                  the customization options further down the page. */}
              {shakeItem && <ShakeFlavorControl item={item} level={coreLevel} onChange={setCoreLevel} />}

              {/* Description + the selectable "What's on it" chips — the chips
                  drive the modifier panel's selection so price and cart agree. */}
              <ItemBuildSummary
                item={item}
                menuSetting={menuSetting}
                description={item.description}
                selectedIds={panelState.selectedIds}
                nestedSelections={panelState.nestedSelections}
                onToggle={toggleChip}
                onNestedChange={setChipNested}
                onIceSizeChange={setChipIceSize}
              />

              {/* Salt question — sides are cooked unsalted, so it sits right
                  above the quantity. */}
              {needsSalt && !soldOut && orderingEnabled && (
                <SideSaltChoice value={saltChoice} onChange={setSaltChoice} />
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

              {editingLine && (
                <p className="text-xs text-patina-mint bg-patina-mint/10 rounded-lg px-3 py-2">
                  Editing your bag item — change any option on this page, then tap Update Bag to save.
                </p>
              )}
              {reorderItem && (
                <p className="text-xs text-patina-mint bg-patina-mint/10 rounded-lg px-3 py-2">
                  From your last order — change anything you like, then tap Add to Bag.
                </p>
              )}

              {/* What will be on the item — the live recap of the choices made,
                  in the words the bag itself will list. */}
              {orderingEnabled && !soldOut && (
                <ItemSelectionSummary
                  item={item}
                  menuSetting={menuSetting}
                  selectedIds={panelState.selectedIds}
                  nestedSelections={panelState.nestedSelections}
                />
              )}

              {/* Add to Bag */}
              <button
                onClick={handleAddToBag}
                disabled={!canAdd}
                className={`w-full py-4 text-base font-heading rounded-xl transition-all flex items-center justify-center gap-2 ${addBtnClass}`}
              >
                <Plus size={18} />
                {addLabel}
                {!soldOut && orderingEnabled && !added && (
                  <PriceChip amount={liveTotal} className="ml-1" />
                )}
              </button>
              {!orderingEnabled && orderingClosedMessage && (
                <p className="text-xs text-center text-muted-foreground">{orderingClosedMessage}</p>
              )}
            </div>

            {/* Right column — modifiers + reviews */}
            <div id="product-modifiers" className="space-y-8 cv-rise">
              {showPanel ? (
                <ProductModifierPanel
                  ref={panelRef}
                  item={item}
                  onConfirm={handlePanelConfirm}
                  onStateChange={setPanelState}
                  initialCartItem={editingLine || reorderItem}
                  saltChoice={saltChoice}
                  flavorLevel={coreLevel}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="font-body">No customizations available for this item.</p>
                </div>
              )}

              {!soldOut && <ProductSuggestions item={item} />}

              {/* Reviews */}
              <div className="pt-6 border-t border-border">
                <h2 className="font-heading text-lg text-obsidian-roast mb-1">Customer reviews</h2>
                <ItemRatings item={item} />
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}