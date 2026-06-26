import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { ShoppingBag, Bike, Utensils, Search } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import MenuItemCard from '@/components/MenuItemCard';
import { useCart } from '@/context/CartContext';

const CATEGORIES = ['All', 'Burgers', 'Chicken', 'Breakfast', 'Sides', 'Shakes', 'Drinks', 'Specials'];

const ORDER_TYPE_CONFIG = {
  pickup: { icon: ShoppingBag, label: 'Pickup', time: '15–25 min' },
  delivery: { icon: Bike, label: 'Delivery', time: '35–50 min' },
  dine_in: { icon: Utensils, label: 'Dine-In', time: 'Seat yourself' },
};

// Fallback sample menu items for demo
const SAMPLE_ITEMS = [
  { id: 'b1', name: 'The Isle Smash Burger', description: 'Double smashed patties, American cheese, special sauce, pickles, on a brioche bun.', price: 10.99, category: 'Burgers', is_featured: true, tags: ['Best Seller', 'Fan Fave'], calories: 720, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&fit=crop' },
  { id: 'b2', name: 'Classic Cheeseburger', description: 'Single beef patty, cheddar, lettuce, tomato, onion, pickles, on a toasted bun.', price: 7.99, category: 'Burgers', tags: ['Classic'], calories: 560, image_url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&q=80&fit=crop' },
  { id: 'b3', name: 'Mushroom Swiss Burger', description: 'Beef patty with sautéed mushrooms, Swiss cheese, and garlic aioli on a pretzel bun.', price: 11.49, category: 'Burgers', tags: ['Premium'], calories: 680, image_url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&q=80&fit=crop' },
  { id: 'b4', name: 'BBQ Bacon Burger', description: 'Crispy bacon, smoked BBQ sauce, crispy onion rings, pepper jack, on a sesame bun.', price: 12.49, category: 'Burgers', is_featured: true, tags: ['Smoky', 'Bacon'], calories: 820, image_url: 'https://images.unsplash.com/photo-1561758033-7e924f619b47?w=600&q=80&fit=crop' },
  { id: 'c1', name: 'Crispy Chicken Sandwich', description: 'Southern-fried chicken breast, pickles, honey mustard on a brioche bun.', price: 9.99, category: 'Chicken', tags: ['Crispy'], calories: 640, image_url: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&q=80&fit=crop' },
  { id: 'c2', name: 'Chicken Tenders & Fries', description: 'Five golden tenders served with your choice of dipping sauce and crinkle fries.', price: 10.99, category: 'Chicken', tags: ['Kids Love It'], calories: 750, image_url: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80&fit=crop' },
  { id: 's1', name: 'Crinkle Fries', description: 'Classic crinkle-cut fries, perfectly salted. Add cheese for $1.', price: 3.49, category: 'Sides', tags: ['Classic'], calories: 380, image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80&fit=crop' },
  { id: 's2', name: 'Loaded Cheese Fries', description: 'Crinkle-cut fries smothered in cheddar sauce, jalapeños, and bacon.', price: 4.99, category: 'Sides', is_featured: true, tags: ['Must Try'], calories: 560, image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80&fit=crop' },
  { id: 's3', name: 'Onion Rings', description: 'Hand-battered thick-cut onion rings. Crispy outside, sweet inside.', price: 3.99, category: 'Sides', tags: ['Classic'], calories: 410, image_url: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600&q=80&fit=crop' },
  { id: 's4', name: 'Coleslaw', description: 'Creamy homestyle coleslaw made fresh daily.', price: 2.49, category: 'Sides', tags: ['Homemade'], calories: 180 },
  { id: 'sh1', name: 'Thick Vanilla Malt', description: 'Hand-spun with real vanilla ice cream and malted milk. Served with extra in the tin.', price: 5.49, category: 'Shakes', is_featured: true, tags: ['Classic', 'Fan Fave'], calories: 620, image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80&fit=crop' },
  { id: 'sh2', name: 'Chocolate Shake', description: 'Rich dark chocolate milkshake, extra thick, topped with whipped cream.', price: 5.49, category: 'Shakes', tags: ['Chocolate'], calories: 680, image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80&fit=crop' },
  { id: 'sh3', name: 'Strawberry Shake', description: 'Fresh strawberry milkshake with real strawberry chunks and cream.', price: 5.49, category: 'Shakes', tags: ['Fruity'], calories: 590, image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80&fit=crop' },
  { id: 'sh4', name: 'Banana Pudding Shake', description: 'Our signature shake — banana pudding swirled into thick vanilla ice cream.', price: 5.99, category: 'Shakes', is_featured: true, tags: ['Signature'], calories: 710, image_url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80&fit=crop' },
  { id: 'd1', name: 'Fountain Soda', description: 'Pepsi, Coke, Sprite, Dr. Pepper — your choice. Free refills.', price: 2.49, category: 'Drinks', tags: ['Refills'], calories: 180 },
  { id: 'd2', name: 'Sweet Iced Tea', description: 'Southern-style sweet tea brewed fresh daily. Free refills.', price: 2.49, category: 'Drinks', tags: ['Southern', 'Refills'], calories: 120 },
  { id: 'd3', name: 'Lemonade', description: 'Fresh-squeezed lemonade. Ask about our strawberry and cherry versions.', price: 2.99, category: 'Drinks', tags: ['Fresh'], calories: 140 },
  { id: 'br1', name: 'Two-Egg Breakfast Plate', description: 'Two eggs any style, choice of meat, toast, and homestyle potatoes.', price: 8.49, category: 'Breakfast', tags: ['All-Day'], calories: 680, image_url: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&q=80&fit=crop' },
  { id: 'br2', name: 'Biscuits & Gravy', description: 'Two fluffy buttermilk biscuits smothered in sausage gravy.', price: 6.99, category: 'Breakfast', tags: ['Southern', 'All-Day'], calories: 590, image_url: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600&q=80&fit=crop' },
  { id: 'sp1', name: "Today's Special", description: 'Ask your server about today\'s chef special — changes daily!', price: 9.99, category: 'Specials', is_featured: true, tags: ['Daily Special'] },
];

export default function Menu() {
  const [items, setItems] = useState(SAMPLE_ITEMS);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const { orderType, setOrderType, setIsCartOpen, totalItems } = useCart();
  const categoryBarRef = useRef(null);

  useEffect(() => {
    base44.entities.MenuItem.list()
      .then(data => { if (data && data.length > 0) setItems(data); })
      .catch(() => {});
  }, []);

  const filtered = items.filter(item => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.description || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && item.is_available !== false;
  });

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
          <div className="flex flex-wrap gap-3 mb-4">
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

      {/* Sticky category Jukebox */}
      <div className="sticky top-[88px] z-40 bg-white/95 backdrop-blur-md border-b border-border shadow-float">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div
            ref={categoryBarRef}
            className="flex gap-2 overflow-x-auto scrollbar-hide py-4"
          >
            {CATEGORIES.map(cat => (
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

      {/* Menu grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-24">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-4xl mb-4">🍽️</p>
            <p className="font-heading text-lg">No items found</p>
            <p className="text-sm">Try a different category or search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(item => (
              <MenuItemCard key={item.id} item={item} />
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