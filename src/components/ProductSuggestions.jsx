import React, { useEffect, useState } from 'react';
import { Plus, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { bucketItem } from '@/lib/itemBuckets';
import ModifierModal from './ModifierModal';
import { optimizedImageUrl } from '@/lib/utils';

// Sandwich / burger pages suggest sides and drinks for one-tap add.
export function isSandwichOrBurger(item) {
  if (!item) return false;
  const cat = (item.category || item.square_category || item.display_category || '').toLowerCase();
  return cat === 'burgers' || /burger|sandwich/i.test(item.name || '');
}

const pick = (items, bucket, n) =>
  items.filter(m => bucketItem(m) === bucket).slice(0, n);

export default function ProductSuggestions({ item }) {
  const { addItem, orderingEnabled } = useCart();
  const [suggestions, setSuggestions] = useState([]);
  const [added, setAdded] = useState({});
  const [modalItem, setModalItem] = useState(null);
  const applicable = isSandwichOrBurger(item);

  useEffect(() => {
    if (!applicable) { setSuggestions([]); return; }
    let cancelled = false;
    base44.entities.MenuItem.list('-updated_date', 500)
      .then(items => {
        if (cancelled) return;
        const pool = (items || []).filter(m =>
          m.id !== item.id && m.is_available !== false && m.is_hidden !== true && (m.image_url_opt || m.image_url));
        setSuggestions([...pick(pool, 'SIDE', 3), ...pick(pool, 'DRINK', 3)]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [applicable, item?.id]);

  if (!applicable || !orderingEnabled || suggestions.length === 0) return null;

  const buildLine = (m, mods, extraCost, deluxeLabel, deluxeToppings) => ({
    id: m.id,
    name: m.name,
    price: m.price + (extraCost || 0),
    image_url_opt: m.image_url_opt,
    image_url: m.image_url,
    category: m.category,
    catalog_object_id: m.square_item_id || '',
    ...(mods ? { selectedModifiers: mods, deluxeLabel: deluxeLabel || undefined, deluxeToppings: deluxeToppings || [] } : {}),
  });

  const handleAdd = (m) => {
    if (m.modifiers && m.modifiers.length > 0) { setModalItem(m); return; }
    addItem(buildLine(m));
    setAdded(prev => ({ ...prev, [m.id]: true }));
  };

  const handleModalConfirm = (mods, extraCost, deluxeLabel, deluxeToppings, comboItems) => {
    if (modalItem) {
      addItem(buildLine(modalItem, mods, extraCost, deluxeLabel, deluxeToppings));
      if (comboItems && comboItems.length > 0) comboItems.forEach(ci => addItem(ci));
      setAdded(prev => ({ ...prev, [modalItem.id]: true }));
    }
    setModalItem(null);
  };

  return (
    <>
      <div className="rounded-2xl bg-midnight-cherry/5 border border-midnight-cherry/15 p-3" data-testid="product-suggestions">
        <p className="font-heading text-xs uppercase tracking-widest text-midnight-cherry mb-2">Add a side or drink</p>
        <div className="space-y-2">
          {suggestions.map(m => (
            <div key={m.id} className="flex items-center gap-2.5">
              <img src={optimizedImageUrl(m.image_url_opt || m.image_url, 200, 200)} alt={m.name} width="200" height="200" loading="lazy" decoding="async" className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm text-obsidian-roast truncate leading-tight">{m.name}</p>
                <p className="text-xs text-patina-mint font-semibold">${m.price.toFixed(2)}</p>
              </div>
              <button
                onClick={() => handleAdd(m)}
                disabled={added[m.id]}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-heading transition-all tap-44 ${
                  added[m.id] ? 'bg-green-100 text-green-700' : 'bg-midnight-cherry text-white hover:opacity-90'
                }`}
              >
                {added[m.id] ? <><Check size={12} /> Added</> : <><Plus size={12} /> {m.modifiers && m.modifiers.length > 0 ? 'Customize' : 'Add'}</>}
              </button>
            </div>
          ))}
        </div>
      </div>
      {modalItem && (
        <ModifierModal item={modalItem} onClose={() => setModalItem(null)} onConfirm={handleModalConfirm} />
      )}
    </>
  );
}
