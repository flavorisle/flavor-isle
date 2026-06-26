import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, Bike, Utensils, Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import MenuItemCard from '@/components/MenuItemCard';
import { useCart } from '@/context/CartContext';

const ORDER_TYPE_CONFIG = {
  pickup: { icon: ShoppingBag, label: 'Pickup', time: '15–25 min' },
  delivery: { icon: Bike, label: 'Delivery', time: '35–50 min' },
  dine_in: { icon: Utensils, label: 'Dine-In', time: 'Seat yourself' },
};

export default function Menu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState(['All']);
  const { orderType, setOrderType, setIsCartOpen, totalItems } = useCart();
  const categoryBarRef = useRef(null);

  useEffect(() => {
    base44.entities.MenuItem.list()
      .then(data => {
        const visible = (data || []).filter(i => !i.is_hidden && i.is_available !== false);
        setItems(visible);

        // Build sorted category list from real Square categories
        const cats = ['All', ...Array.from(new Set(
          visible.map(i => i.square_category).filter(Boolean)
        )).sort()];
        setCategories(cats);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visibleItems = items.filter(item => {
    const matchSearch = !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || item.square_category === activeCategory;
    return matchSearch && matchCat;
  });

  // Group items by category for the "All" view
  const grouped = (() => {
    if (activeCategory !== 'All' || search) {
      return [{ category: activeCategory === 'All' ? 'Results' : activeCategory, items: visibleItems }];
    }
    const map = {};
    for (const item of visibleItems) {
      const cat = item.square_category || 'Other';
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => ({ category, items }));
  })();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      {/* Page header */}
      <div className="bg-obsidian-roast py-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">Order Online</p>
          <h1 className="font-heading text-5xl text-white mb-6">The Menu</h1>

          {/* Order type switcher */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(ORDER_TYPE_CONFIG).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  onClick={() => setOrderType(type)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-heading transition-all ${
                    orderType === type
                      ? 'bg-midnight-cherry text-white shadow-float'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <Icon size={16} />
                  {config.label}
                  <span className={`text-xs font-body ${orderType === type ? 'text-red-200' : 'text-white/40'}`}>
                    {config.time}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky category bar */}
      <div className="sticky top-[88px] z-40 bg-white/95 backdrop-blur-md border-b border-border shadow-float">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div ref={categoryBarRef} className="flex gap-2 overflow-x-auto scrollbar-hide py-4">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-heading transition-all ${
                  activeCategory === cat
                    ? 'bg-midnight-cherry text-white'
                    : 'bg-muted text-muted-foreground hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search the menu…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
          />
        </div>
      </div>

      {/* Menu content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
            <p className="font-heading">Loading menu…</p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-4xl mb-4">🍽️</p>
            <p className="font-heading text-lg">No items found</p>
            <p className="text-sm">Try a different category or search term</p>
          </div>
        ) : (
          <div className="space-y-14">
            {grouped.map(({ category, items: groupItems }) => (
              <div key={category}>
                {(activeCategory === 'All' && !search) && (
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="font-heading text-2xl text-obsidian-roast whitespace-nowrap">{category}</h2>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-sm text-muted-foreground">{groupItems.length} item{groupItems.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {groupItems.map(item => (
                    <MenuItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating cart bubble */}
      {totalItems > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 bg-midnight-cherry text-white px-6 py-4 rounded-2xl shadow-float-lg flex items-center gap-3 z-40 animate-float-up hover:bg-red-800 transition-colors"
        >
          <div className="relative">
            <ShoppingBag size={22} />
            <span className="absolute -top-2 -right-2 bg-patina-mint text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-heading">
              {totalItems}
            </span>
          </div>
          <span className="font-heading text-sm">View Order</span>
        </button>
      )}

      <Footer />
    </div>
  );
}