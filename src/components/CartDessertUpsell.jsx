import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Cookie, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { bucketItem } from '@/lib/itemBuckets';

// Inline (non-blocking) dessert upsell rail for the cart drawer. Mirrors the
// post-order recommendation email's "MAIN + SIDE, no DESSERT" rule: when the
// cart has a burger/fries-style order with no dessert/shake, shows up to 3
// fan-favorite desserts the customer can add in one tap. Sits inline in the
// cart — never a popup, never blocks checkout.
export default function CartDessertUpsell() {
  const { cartItems, addItem } = useCart();
  const [suggestions, setSuggestions] = useState([]);
  const [added, setAdded] = useState({});

  // Bucket the current cart into MAIN / SIDE / DESSERT counts.
  const buckets = useMemo(() => {
    const b = { MAIN: 0, SIDE: 0, DESSERT: 0, DRINK: 0, OTHER: 0 };
    for (const item of cartItems) {
      const bucket = bucketItem(item);
      b[bucket] = (b[bucket] || 0) + (item.quantity || 1);
    }
    return b;
  }, [cartItems]);

  const shouldShow = buckets.MAIN > 0 && buckets.SIDE > 0 && buckets.DESSERT === 0;

  useEffect(() => {
    if (!shouldShow) { setSuggestions([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const items = await base44.entities.MenuItem.list('-updated_date', 500);
        if (cancelled) return;
        const desserts = items
          .filter(m => bucketItem(m) === 'DESSERT' && m.is_available !== false && m.is_hidden !== true && m.image_url)
          .sort((a, b) => {
            const fa = b.is_fan_favorite ? 1 : 0;
            const fb = a.is_fan_favorite ? 1 : 0;
            if (fa !== fb) return fa - fb;
            return (a.fan_favorite_rank || 999) - (b.fan_favorite_rank || 999);
          })
          .slice(0, 3);
        if (!cancelled) setSuggestions(desserts);
      } catch {
        // menu fetch failed — rail stays hidden
      }
    })();
    return () => { cancelled = true; };
  }, [shouldShow]);

  if (!shouldShow || suggestions.length === 0) return null;

  const handleAdd = (item) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      category: item.category,
      catalog_object_id: item.square_item_id || '',
    });
    setAdded(prev => ({ ...prev, [item.id]: true }));
  };

  return (
    <div className="rounded-2xl bg-midnight-cherry/5 border border-midnight-cherry/15 p-3 mt-1">
      <div className="flex items-center gap-2 mb-2">
        <Cookie size={15} className="text-midnight-cherry flex-shrink-0" />
        <p className="font-heading text-xs uppercase tracking-widest text-midnight-cherry">Save room for dessert?</p>
      </div>
      <div className="space-y-2">
        {suggestions.map(item => (
          <div key={item.id} className="flex items-center gap-2.5">
            <img src={item.image_url} alt={item.name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-heading text-sm text-obsidian-roast truncate leading-tight">{item.name}</p>
              <p className="text-xs text-patina-mint font-semibold">${item.price.toFixed(2)}</p>
            </div>
            <button
              onClick={() => handleAdd(item)}
              disabled={added[item.id]}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-heading transition-all tap-44 ${
                added[item.id]
                  ? 'bg-green-100 text-green-700'
                  : 'bg-midnight-cherry text-white hover:opacity-90'
              }`}
            >
              {added[item.id] ? <><Check size={12} /> Added</> : <><Plus size={12} /> Add</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}