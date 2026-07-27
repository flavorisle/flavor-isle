import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Bike, Utensils } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { getMenuSetting } from '@/lib/menuSettings';
import { itemCategoryKey, categoryLabel, sortCategories, sortItemsInCategory } from '@/lib/menuCategory';

// Landing-page menu browser: each category is its own horizontal (left-to-right)
// scroll row, so guests can shop the whole menu here instead of scrolling one
// long menu page. Top of the section surfaces a clear order entry.
const ORDER_TYPES = [
  { id: 'pickup', label: 'Pickup', icon: ShoppingBag, time: '15–25 min' },
  { id: 'delivery', label: 'Delivery', icon: Bike, time: '35–50 min' },
  { id: 'dine_in', label: 'Dine-In', icon: Utensils, time: 'Seat yourself' },
];

export default function MenuCategoryRows() {
  const { setOrderType, orderType } = useCart();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState({ hidden: [], renames: {}, itemOrder: {}, order: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([base44.entities.MenuItem.list(), getMenuSetting()])
      .then(([list, s]) => {
        if (!mounted) return;
        setItems((list || []).filter(i => !i.is_hidden));
        setSettings({
          hidden: s.hidden_categories || [],
          renames: s.category_renames || {},
          itemOrder: s.category_item_order || {},
          order: s.category_sort_order || [],
        });
      })
      .catch(() => {})
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const goOrder = (type) => { setOrderType(type); navigate('/menu'); };

  const keys = sortCategories(
    Array.from(new Set(items.map(itemCategoryKey))).filter(k => !settings.hidden.includes(k)),
    settings.order
  );

  return (
    <section className="py-16 bg-obsidian-roast">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Order entry */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
          <div>
            <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">Order Online</p>
            <h2 className="font-heading text-4xl text-white">Browse the Menu</h2>
            <p className="text-gray-400 text-sm mt-2">Pick a category, tap an item, and we'll fire up the grill.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ORDER_TYPES.map(t => {
              const Icon = t.icon;
              const active = orderType === t.id;
              return (
                <button key={t.id} onClick={() => goOrder(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-heading transition-all ${active ? 'bg-midnight-cherry text-white shadow-float' : 'bg-white/10 text-white/80 hover:bg-white/20'}`}>
                  <Icon size={16} /> {t.label}
                  <span className={`text-xs font-body ${active ? 'text-red-200' : 'text-white/40'}`}>{t.time}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm mb-12">
          Go to Full Menu <ArrowRight size={16} />
        </Link>

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="w-10 h-10 border-4 border-white/20 rounded-full animate-spin mx-auto mb-3" style={{ borderTopColor: 'var(--patina-mint)' }} />
            <p className="font-heading">Loading menu…</p>
          </div>
        ) : keys.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No items available right now.</p>
        ) : (
          <div className="space-y-10">
            {keys.map(key => {
              const rowItems = sortItemsInCategory(
                items.filter(i => itemCategoryKey(i) === key),
                settings.itemOrder[key] || []
              );
              return (
                <div key={key}>
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="font-heading text-2xl text-white whitespace-nowrap">{categoryLabel(key, settings.renames)}</h3>
                    <div className="flex-1 h-px bg-white/15" />
                    <span className="text-xs text-gray-400">{rowItems.length} item{rowItems.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x">
                    {rowItems.map(item => (
                      <Link to="/menu" key={item.id}
                        className="group snap-start flex-shrink-0 w-60 rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-midnight-cherry/50 transition-all">
                        <div className="relative h-32 overflow-hidden">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center text-3xl">🍽️</div>
                          )}
                          {item.is_featured && <span className="absolute top-2 right-2 bg-midnight-cherry text-white text-[10px] font-heading px-2 py-0.5 rounded-full">Featured</span>}
                        </div>
                        <div className="p-3">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-heading text-white text-sm leading-tight">{item.name}</h4>
                            <span className="text-midnight-cherry font-heading text-sm whitespace-nowrap">${item.price?.toFixed(2)}</span>
                          </div>
                          {item.description && <p className="text-gray-400 text-xs leading-relaxed mt-1 line-clamp-2">{item.description}</p>}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}