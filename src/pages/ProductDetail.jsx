import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Zap, Star, Clock, Sparkles, Heart, Pencil, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { isHappyHourItem, getHappyHourItemPrice } from '@/lib/happyHour';
import { trackViewItem, trackSelectItem, foodItemToGa4 } from '@/lib/ga4Ecommerce';
import { loadComboData, comboForItem, comboPricing, componentTotal } from '@/lib/comboConfig';
import ProductModifierPanel from '@/components/ProductModifierPanel';
import ComboPicker from '@/components/ComboPicker';
import ItemRatings from '@/components/ItemRatings';
import ShareItemButton from '@/components/ShareItemButton';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

const PLACEHOLDER_EMOJI = {
  Burgers: '🍔', Shakes: '🥤', Sides: '🍟', Drinks: '🧃',
  Breakfast: '🍳', Chicken: '🍗', Specials: '⭐',
};

// Two-column product detail: sticky summary (title, price, image, combo summary,
// quantity, Add to Bag) on the left; the combo picker and the inline modifier
// panel on the right. Modifier, Deluxe, and Happy Hour logic lives in
// ProductModifierPanel; ComboConfig combos live in ComboPicker. This page owns
// layout, quantity, combos, and the add flow.
//
// A combo is added as ONE cart line carrying comboConfigId + comboComponents —
// the shape verifyOrderPricing reprices server-side (component prices from the
// catalog, discount from the ComboConfig), so the combo price is never trusted
// from the browser. The savings figure is customer-facing only: it is not part
// of the order payload, so kitchen tickets and the POS never show discount info.
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
  const [comboOffer, setComboOffer] = useState(null);
  const [comboOn, setComboOn] = useState(false);
  const [comboPick, setComboPick] = useState(null);
  const [panelState, setPanelState] = useState({ total: 0, extraCost: 0, deluxeLabel: null, burgerModsLabel: null, ready: true });
  const panelRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setComboOn(false);
    setComboPick(null);
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

  // Which active combo this item's category belongs to, resolved against the
  // live menu. Combos whose side or drink categories are empty are skipped by
  // resolveCombos and never offered.
  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    loadComboData()
      .then(({ usable }) => {
        if (cancelled) return;
        const offer = comboForItem(usable, item);
        setComboOffer(offer ? {
          id: offer.id,
          name: offer.name,
          discount_percent: offer.discount_percent,
          side_category: offer.side_category,
          drink_category: offer.drink_category,
          side: offer.side,
          drink: offer.drink,
        } : null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [item]);

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

  // Live combo math — the burger component is the item's own price plus the
  // options selected in the panel (no Happy Hour on a combo, matching the
  // server). Recomputed from the panel's real selection when the combo is added.
  const burgerBase = item ? Number(item.price) + Number(panelState.extraCost || 0) : 0;
  const comboReady = !!(comboPick && comboPick.ready);
  const comboMath = comboOffer && comboReady
    ? comboPricing(comboOffer, [
        { name: item.name, total: burgerBase, selectedModifiers: [] },
        comboPick.sideComponent,
        comboPick.drinkComponent,
      ])
    : null;
  const comboActive = comboOn && !!comboMath;
  const comboNotReady = comboOn && !comboReady;

  // Build the single combo line: main + side + drink as components, priced with
  // the ComboConfig discount. Every component carries its square_item_id and
  // catalog modifier ids so the server can reprice each one.
  const buildComboLine = () => {
    const sel = panelRef.current?.getSelection?.() || { selectedMods: [], label: null, allToppings: [] };
    const components = [
      {
        name: item.name,
        square_item_id: item.square_item_id,
        total: componentTotal(item.price, sel.selectedMods),
        selectedModifiers: sel.selectedMods,
      },
      comboPick.sideComponent,
      comboPick.drinkComponent,
    ];
    const { original, price } = comboPricing(comboOffer, components);
    return {
      id: `combo-${comboOffer.id}-${Date.now()}`,
      alwaysUnique: true,
      productId: item.id,
      name: `${comboOffer.name}: ${item.name} + ${comboPick.sideName} + ${comboPick.drinkName}`,
      image_url: item.image_url,
      price,
      quantity: 1,
      selectedModifiers: components.flatMap(c => c.selectedModifiers || []),
      deluxeLabel: sel.label || undefined,
      deluxeToppings: sel.allToppings || [],
      comboConfigId: comboOffer.id,
      comboComponents: components.map(c => ({
        name: c.name,
        square_item_id: c.square_item_id,
        selectedModifiers: c.selectedModifiers || [],
      })),
      comboSavings: original - price,
    };
  };

  const flashAdded = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const handlePanelConfirm = (selectedMods, extraCost, deluxeLabel, deluxeToppings) => {
    const baseItem = {
      ...item,
      productId: item.id,
      price: item.price + extraCost,
      selectedModifiers: selectedMods,
      deluxeLabel: deluxeLabel || undefined,
      deluxeToppings: deluxeToppings || [],
    };
    for (let i = 0; i < quantity; i++) addItem(baseItem);
    flashAdded();
  };

  const handleAddToBag = () => {
    if (!orderingEnabled || soldOut) return;
    if (comboOn) {
      if (!comboReady) return;
      if (showPanel && !panelRef.current?.isReady()) return;
      trackSelectItem(foodItemToGa4(item));
      const line = buildComboLine();
      for (let i = 0; i < quantity; i++) addItem(line);
      flashAdded();
      return;
    }
    if (showPanel) {
      if (!panelRef.current?.isReady()) return;
      trackSelectItem(foodItemToGa4(item));
      panelRef.current.confirm();
    } else {
      trackSelectItem(foodItemToGa4(item));
      for (let i = 0; i < quantity; i++) addItem({ ...item, productId: item.id });
      flashAdded();
    }
  };

  const canAdd = !soldOut && orderingEnabled && !comboNotReady;
  const comboHint = comboNotReady ? 'Pick a side and a drink for your combo' : null;
  const addLabel = soldOut
    ? 'Sold Out'
    : !orderingEnabled
      ? 'Ordering Closed'
      : added
        ? 'Added to Cart!'
        : comboHint
          ? comboHint
          : comboActive
            ? 'Add Combo to Bag'
            : 'Add to Bag';
  const addBtnClass = (soldOut || !orderingEnabled)
    ? 'bg-muted text-muted-foreground cursor-not-allowed'
    : added
      ? 'bg-patina-mint text-white'
      : comboNotReady
        ? 'btn-cherry opacity-50 cursor-not-allowed'
        : 'btn-cherry chrome-hover';
  const liveTotal = comboActive
    ? comboMath.price * quantity
    : showPanel
      ? panelState.total * quantity
      : (displayPrice || 0) * quantity;

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

              {/* Combo summary — shown while a combo is active */}
              {comboOn && (
                <div className="rounded-2xl border-2 border-midnight-cherry/30 bg-midnight-cherry/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-xs uppercase tracking-widest text-midnight-cherry">{comboOffer.name}</span>
                    <button
                      onClick={() => setComboOn(false)}
                      className="text-xs text-muted-foreground hover:text-midnight-cherry underline"
                    >
                      Remove combo
                    </button>
                  </div>
                  {/* Main row */}
                  <div className="flex justify-between items-start gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-body font-semibold text-obsidian-roast">{item.name}</span>
                      {panelState.burgerModsLabel && (
                        <span className="block text-xs text-muted-foreground leading-tight">{panelState.burgerModsLabel}</span>
                      )}
                    </div>
                    <button
                      onClick={() => document.getElementById('product-modifiers')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                      className="text-xs text-patina-mint hover:text-midnight-cherry font-heading flex items-center gap-1 flex-shrink-0"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                  </div>
                  {/* Side row */}
                  {comboPick?.sideName ? (
                    <div className="flex justify-between items-start gap-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="font-body font-semibold text-obsidian-roast">{comboPick.sideName}</span>
                        {comboPick.sideModsLabel && (
                          <span className="block text-xs text-muted-foreground leading-tight">{comboPick.sideModsLabel}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">Pick a side to get started…</div>
                  )}
                  {/* Drink row */}
                  {comboPick?.drinkName ? (
                    <div className="flex justify-between items-start gap-3 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="font-body font-semibold text-obsidian-roast">{comboPick.drinkName}</span>
                        {comboPick.drinkModsLabel && (
                          <span className="block text-xs text-muted-foreground leading-tight">{comboPick.drinkModsLabel}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">Pick your drink…</div>
                  )}
                  {comboActive && (
                    <div className="flex items-center justify-between pt-2 border-t border-midnight-cherry/20 text-sm">
                      <span className="font-heading text-midnight-cherry">Combo price · save {comboMath.percent}%</span>
                      <span className="font-heading text-midnight-cherry">${comboMath.price.toFixed(2)}</span>
                    </div>
                  )}
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
              {comboOffer && !comboOn && !soldOut && orderingEnabled && (
                <p className="text-xs text-center text-patina-mint font-heading flex items-center justify-center gap-1">
                  <Sparkles size={12} /> Add a side and a drink — save {comboOffer.discount_percent}%
                </p>
              )}
              {comboOffer && comboOn && comboReady && (
                <p className="text-xs text-center text-midnight-cherry font-heading flex items-center justify-center gap-1">
                  <Check size={12} /> Combo savings ${(comboMath.original - comboMath.price).toFixed(2)}
                </p>
              )}
            </div>

            {/* Right column — combo picker + modifiers + reviews */}
            <div id="product-modifiers" className="space-y-8">
              {comboOffer && !soldOut && orderingEnabled && (
                <ComboPicker
                  combo={comboOffer}
                  active={comboOn}
                  onToggle={setComboOn}
                  onChange={setComboPick}
                />
              )}

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