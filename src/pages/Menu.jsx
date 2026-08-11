import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, Bike, Utensils, Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import GroupOrderBar from '@/components/GroupOrderBar';
import MenuItemCard from '@/components/MenuItemCard';
import FanFavoritesSection from '@/components/FanFavoritesSection';
import { useCart } from '@/context/CartContext';
import { getMenuSetting } from '@/lib/menuSettings';
import { itemCategoryKey, categoryLabel, sortCategories, sortItemsInCategory } from '@/lib/menuCategory';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import PullRefreshIndicator from '@/components/PullRefreshIndicator';
import ConversionNudgeBar from '@/components/ConversionNudgeBar';
import SocialProofStrip from '@/components/SocialProofStrip';
import AdBannerStrip from '@/components/AdBannerStrip';
import SignUpNudge from '@/components/SignUpNudge';
import MadeFreshBanner from '@/components/MadeFreshBanner';
import ShakeIslePromo from '@/components/ShakeIslePromo';
import { ORDER_TYPE_IMAGES } from '@/lib/orderTypeImages';

const ORDER_TYPE_CONFIG = {
  pickup: { icon: ShoppingBag, label: 'Pickup', time: '15–25 min' },
  delivery: { icon: Bike, label: 'Delivery', time: '35–50 min' },
  dine_in: { icon: Utensils, label: 'Dine-In', time: 'Seat yourself' }
};

export default function Menu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [hiddenCats, setHiddenCats] = useState([]);
  const [categoryOrder, setCategoryOrder] = useState([]);
  const [renames, setRenames] = useState({});
  const [itemOrder, setItemOrder] = useState({});
  const { orderType, setOrderType, setIsCartOpen, totalItems, orderingEnabled, orderingClosedMessage } = useCart();

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
      setItems((data || []).filter((i) => !i.is_hidden));
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { reload(); }, []);
  const { pull, refreshing } = usePullToRefresh(reload);

  // Items matching the search, excluding hidden categories.
  const visibleItems = items.filter((item) => {
    const key = itemCategoryKey(item);
    if (hiddenCats.includes(key)) return false;
    const matchSearch = !search ||
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.description || '').toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  // Group items by effective category; one row per category (items scroll left→right).
  const rows = (() => {
    if (search) {
      return [{ key: 'Results', items: visibleItems }];
    }
    const map = {};
    for (const item of visibleItems) {
      const key = itemCategoryKey(item);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return sortCategories(Object.keys(map), categoryOrder).map((key) => ({
      key,
      items: sortItemsInCategory(map[key], itemOrder[key] || [])
    }));
  })();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
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
          <div className="grid grid-cols-3 gap-3 max-w-2xl">
            {Object.entries(ORDER_TYPE_CONFIG).map(([type, config]) => {
              const active = orderType === type;
              return (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`group relative overflow-hidden rounded-2xl transition-all ${
                    active ? 'ring-2 ring-smashie-yellow shadow-float' : 'ring-1 ring-white/15 hover:ring-white/40'
                  }`}
                >
                  <img
                    src={ORDER_TYPE_IMAGES[type]}
                    alt={config.label}
                    className={`w-full aspect-square object-cover transition-transform group-hover:scale-105 ${active ? '' : 'opacity-80 group-hover:opacity-100'}`}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-6 pb-2 text-center">
                    <span className="block font-heading text-sm text-white leading-none">{config.label}</span>
                    <span className="text-[11px] font-body text-white/70">{config.time}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!orderingEnabled &&
      <div className="bg-midnight-cherry text-white text-center text-sm font-heading py-3 px-4 tracking-wide animate-float-up">
          {orderingClosedMessage}
        </div>
      }

      <AdBannerStrip placement="menu" />

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

      {/* Menu content — one horizontal row per category */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {!search && !loading && items.length > 0 && (
          <>
            <FanFavoritesSection items={items} />
            <div className="mt-8">
              <ShakeIslePromo />
            </div>
          </>
        )}
        {loading ?
        <div className="text-center py-20 text-muted-foreground">
            <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
            <p className="font-heading">Loading menu…</p>
          </div> :
        rows.length === 0 || rows.every((r) => r.items.length === 0) ?
        <div className="text-center py-20 text-muted-foreground">
            <p className="text-4xl mb-4">🍽️</p>
            <p className="font-heading text-lg">No items found</p>
            <p className="text-sm">Try a different search term</p>
          </div> :

        <div className="space-y-12">
            {rows.map(({ key, items: rowItems }) =>
          <div key={key}>
                <div className="flex items-center gap-4 mb-5">
                  <h2 className="font-heading text-2xl text-obsidian-roast whitespace-nowrap">
                    {search ? 'Search Results' : categoryLabel(key, renames)}
                  </h2>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-sm text-muted-foreground">{rowItems.length} item{rowItems.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-2 snap-x">
                  {rowItems.map((item) =>
              <div key={item.id} className="snap-start flex-shrink-0 w-72">
                      <MenuItemCard item={item} />
                    </div>
              )}
                </div>
              </div>
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