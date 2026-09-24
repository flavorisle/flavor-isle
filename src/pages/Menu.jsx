import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, Bike, Utensils, Search, Car, ArrowLeft, AlertCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Seo from '@/components/Seo';
import CartDrawer from '@/components/CartDrawer';
import GroupOrderBar from '@/components/GroupOrderBar';
import MenuItemCard from '@/components/MenuItemCard';
import CravingsBox from '@/components/CravingsBox';
import { useCart } from '@/context/CartContext';
import { getMenuSetting } from '@/lib/menuSettings';
import { itemCategoryKey, categoryLabel, sortCategories, sortItemsInCategory } from '@/lib/menuCategory';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import PullRefreshIndicator from '@/components/PullRefreshIndicator';
import ConversionNudgeBar from '@/components/ConversionNudgeBar';
import SocialProofStrip from '@/components/SocialProofStrip';
import AdBannerStrip from '@/components/AdBannerStrip';
import HappyHourBanner from '@/components/HappyHourBanner';
import MilkshakePromoBanner from '@/components/MilkshakePromoBanner';
import MenuCategoryChips from '@/components/MenuCategoryChips';
import SignUpNudge from '@/components/SignUpNudge';
import MadeFreshBanner from '@/components/MadeFreshBanner';
import { ORDER_TYPE_IMAGES } from '@/lib/orderTypeImages';
import useLiveStatus from '@/hooks/useLiveStatus';
import { trackViewItemList, foodItemToGa4 } from '@/lib/ga4Ecommerce';

// Pickup / delivery estimates scale with the live kitchen load so the menu
// matches the hero, status bar, and checkout everywhere times are shown.
const ORDER_TYPE_CONFIG = (waitMin) => ({
  pickup: { icon: ShoppingBag, label: 'Pickup', time: `${Math.max(10, waitMin - 5)}–${waitMin + 5} min` },
  curbside: { icon: Car, label: 'Curbside', time: `${Math.max(10, waitMin - 5)}–${waitMin + 5} min` },
  delivery: { icon: Bike, label: 'Delivery', time: `${waitMin + 15}–${waitMin + 25} min` },
  dine_in: { icon: Utensils, label: 'Dine-In', time: 'Seat yourself' }
});

export default function Menu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hiddenCats, setHiddenCats] = useState([]);
  const [categoryOrder, setCategoryOrder] = useState([]);
  const [renames, setRenames] = useState({});
  const [itemOrder, setItemOrder] = useState({});
  const { orderType, setOrderType, pickupMethod, setPickupMethod, setIsCartOpen, totalItems, orderingEnabled, orderingClosedMessage } = useCart();
  const { level } = useLiveStatus();
  const ORDER_TYPES = ORDER_TYPE_CONFIG(level?.waitMin || 20);
  const location = useLocation();
  const navigate = useNavigate();

  // Share-link focus: /menu?item=<id> opens that item's customization view.
  // Keyed by the stable item id so the link survives name/category changes.
  const focusItemId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('item') || null;
  }, [location.search]);

  const focusedItem = focusItemId ? items.find((i) => i.id === focusItemId) : null;
  const focusMissing = !!focusItemId && !loading && !focusedItem;

  // Scroll the focused card into view once the items have loaded.
  useEffect(() => {
    if (!focusItemId || loading || items.length === 0) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`menu-item-${focusItemId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 100);
    return () => clearTimeout(t);
  }, [focusItemId, loading, items.length]);

  // Order-type tiles — curbside is a pickup variant (orderType 'pickup' +
  // pickupMethod 'curbside'), so its active/onClick differ from counter pickup.
  const orderTiles = [
    { key: 'pickup', label: ORDER_TYPES.pickup.label, time: ORDER_TYPES.pickup.time, img: ORDER_TYPE_IMAGES.pickup, onSelect: () => { setOrderType('pickup'); setPickupMethod('counter'); }, isActive: orderType === 'pickup' && pickupMethod !== 'curbside' },
    { key: 'curbside', label: ORDER_TYPES.curbside.label, time: ORDER_TYPES.curbside.time, img: ORDER_TYPE_IMAGES.curbside, onSelect: () => { setOrderType('pickup'); setPickupMethod('curbside'); }, isActive: orderType === 'pickup' && pickupMethod === 'curbside' },
    { key: 'delivery', label: ORDER_TYPES.delivery.label, time: ORDER_TYPES.delivery.time, img: ORDER_TYPE_IMAGES.delivery, onSelect: () => setOrderType('delivery'), isActive: orderType === 'delivery' },
    { key: 'dine_in', label: ORDER_TYPES.dine_in.label, time: ORDER_TYPES.dine_in.time, img: ORDER_TYPE_IMAGES.dine_in, onSelect: () => setOrderType('dine_in'), isActive: orderType === 'dine_in' },
  ];

  const reload = async () => {
    try {
      const s = await getMenuSetting();
      setHiddenCats(s.hidden_categories || []);
      setCategoryOrder(s.category_sort_order || []);
      setRenames(s.category_renames || []);
      setItemOrder(s.category_item_order || {});
    } catch (e) {}
    try {
      const data = await base44.entities.MenuItem.list();
      const visible = (data || []).filter((i) => !i.is_hidden);
      setItems(visible);
      trackViewItemList(visible.map(foodItemToGa4), { item_list_id: 'menu', item_list_name: 'Menu' });
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);
  const { pull, refreshing } = usePullToRefresh(reload);

  // Milkshakes live on their own page — pull them out of the menu and promote
  // the Shake Isle page in their place.
  const SHAKE_KEY = 'Whirl & Twirl';

  // Items matching the search, excluding hidden categories and the shake category.
  const visibleItems = items.filter((item) => {
    const key = itemCategoryKey(item);
    if (hiddenCats.includes(key)) return false;
    if (key === SHAKE_KEY) return false;
    const matchSearch = !search ||
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.description || '').toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  // Group items by effective category; one row per category (items scroll left→right).
  // The shake category is replaced by a promo banner row linking to Shake Isle.
  const rows = (() => {
    if (search) {
      return [{ key: 'Results', items: visibleItems, isShakeBanner: false }];
    }
    const map = {};
    for (const item of visibleItems) {
      const key = itemCategoryKey(item);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    const keys = [...Object.keys(map), SHAKE_KEY];
    return sortCategories(keys, categoryOrder).map((key) => ({
      key,
      items: key === SHAKE_KEY ? [] : sortItemsInCategory(map[key], itemOrder[key] || []),
      isShakeBanner: key === SHAKE_KEY,
    }));
  })();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Seo
        ogTitle="Flavor Isle Menu — Burgers, Shakes & Diner Favorites | Smiths Grove, KY"
        ogDescription="The full Flavor Isle menu: hand-patted burgers, real-fruit milkshakes, curly fries and more — order online for pickup or delivery, 0.7 miles off I-65 Exit 38."
        ogImage="https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/8bd9c4f84_card-menu.png"
        ogImageAlt="Flavor Isle menu preview card with hand-patted burger and milkshake"
      />
      <Navbar />
      <CartDrawer />
      <PullRefreshIndicator pull={pull} refreshing={refreshing} />
      <ConversionNudgeBar />
      <GroupOrderBar />
      <div className="bg-obsidian-roast py-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm font-heading uppercase tracking-widest mb-2 text-[hsl(var(--primary))]">ORDER ONLINE</p>
          <h1 className="font-heading text-5xl text-white mb-6">The Menu</h1>
          <div className="mb-6">
            <SocialProofStrip tone="light" />
          </div>

          {/* Order type switcher */}
          <div className="flex flex-col lg:flex-row gap-6 items-center lg:items-stretch">
          <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-xl w-full">
            {orderTiles.map(t => (
              <button
                key={t.key}
                onClick={t.onSelect}
                className={`group relative overflow-hidden rounded-2xl aspect-square transition-all ${
                  t.isActive ? 'ring-4 ring-smashie-yellow shadow-float' : 'ring-2 ring-white/40 hover:ring-white/70'
                }`}
              >
                <img
                  src={t.img}
                  alt={t.label}
                  loading="lazy"
                  className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${t.isActive ? '' : 'opacity-90 group-hover:opacity-100'}`}
                />
                {/* Item-card style: gradient overlay so the label/time overlap
                    the artwork instead of sitting on a solid plate. */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 px-1.5 py-2 text-center">
                  <span className={`block font-heading text-base leading-none ${t.isActive ? 'text-smashie-yellow' : 'text-white'}`}>
                    {t.label}
                  </span>
                  <span className="text-xs font-body font-semibold text-white">{t.time}</span>
                </div>
              </button>
            ))}
          </div>
          </div>
        </div>
      </div>

      {!orderingEnabled &&
      <div className="bg-midnight-cherry text-white text-center text-sm font-heading py-3 px-4 tracking-wide animate-float-up">
          {orderingClosedMessage}
        </div>
      }

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <HappyHourBanner />
      </div>
      <AdBannerStrip placement="menu" />

      {!search && !loading && rows.some((r) => r.isShakeBanner || r.items.length > 0) && (
        <MenuCategoryChips rows={rows} renames={renames} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <SignUpNudge variant="compact" />
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search the menu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
          
        </div>
      </div>

      {/* Share-link unavailable state — the item id is hidden, deleted, or invalid */}
      {focusMissing && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4">
          <div className="card-diner p-6 text-center">
            <div className="w-12 h-12 bg-midnight-cherry/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={22} className="text-midnight-cherry" />
            </div>
            <h3 className="font-heading text-xl text-obsidian-roast mb-1">This item isn't available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The link you opened may be for an item that's sold out, no longer on the menu, or hidden. Browse the full menu below.
            </p>
            <button
              onClick={() => navigate('/menu')}
              className="btn-cherry chrome-hover px-6 py-2.5 text-sm font-heading inline-flex items-center gap-2"
            >
              <ArrowLeft size={15} /> Back to full menu
            </button>
          </div>
        </div>
      )}

      {/* Menu content — one horizontal row per category */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {!search && !loading && items.length > 0 && (
          <>
            <CravingsBox items={items} />
          </>
        )}
        {loading ?
        <div className="text-center py-20 text-muted-foreground">
            <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
            <p className="font-heading">Loading menu…</p>
          </div> :
        !rows.some((r) => r.isShakeBanner || r.items.length > 0) ?
        <div className="text-center py-20 text-muted-foreground">
            <p className="text-4xl mb-4">🍽️</p>
            <p className="font-heading text-lg">No items found</p>
            <p className="text-sm">Try a different search term</p>
          </div> :

        <div className="space-y-12">
            {rows.map(({ key, items: rowItems, isShakeBanner }) =>
          isShakeBanner ? (
            <div key={key} id={`menu-cat-${key.replace(/[^a-zA-Z0-9]/g, '')}`}>
              <div className="flex items-center gap-4 mb-5">
                <h2 className="font-heading text-2xl text-obsidian-roast whitespace-nowrap">Whirl &amp; Twirl</h2>
                <div className="flex-1 h-px bg-border" />
              </div>
              <MilkshakePromoBanner variant="strip" />
            </div>
          ) : (
          <div key={key} id={`menu-cat-${key.replace(/[^a-zA-Z0-9]/g, '')}`}>
                <div className="flex items-center gap-4 mb-5">
                  <h2 className="font-heading text-2xl text-obsidian-roast whitespace-nowrap">
                    {search ? 'Search Results' : categoryLabel(key, renames)}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-sm text-muted-foreground">{rowItems.length} item{rowItems.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-2 snap-x">
                  {rowItems.map((item) =>
              <div key={item.id} id={`menu-item-${item.id}`} className="snap-start flex-shrink-0 w-72">
                      <MenuItemCard item={item} autoOpen={item.id === focusItemId} />
                    </div>
              )}
                </div>
              </div>
          )
          )}
          </div>
        }
      </div>

      <MadeFreshBanner />

      {/* Floating cart bubble */}
      {totalItems > 0 &&
      <button
        onClick={() => setIsCartOpen(true)}
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
        className="fixed right-6 md:!bottom-6 bg-midnight-cherry text-white px-6 py-4 rounded-2xl shadow-float-lg flex items-center gap-3 z-[60] animate-float-up hover:bg-red-800 transition-colors">
        
          <div className="relative">
            <ShoppingBag size={22} />
            <span className="absolute -top-2 -right-2 bg-patina-mint text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-heading">
              {totalItems}
            </span>
          </div>
          <span className="font-heading text-sm">View Order</span>
        </button>
      }

      <Footer />
    </div>);

}