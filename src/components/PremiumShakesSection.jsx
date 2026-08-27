import React, { useState, useEffect } from 'react';
import { Plus, Check, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import ModifierModal from './ModifierModal';

// The five specialty "Bliss" shakes — standalone Square items with their own
// pricing and a Size modifier. Displayed below the build-your-own flavor grid.
const PREMIUM_SHAKE_IDS = [
  '6a3e37fe23e413b185c3732a', // Banana Pudding Bliss
  '6a3e3807f128347090f2090d', // Circus Cookie Bliss
  '6a3e3805ff57925d93d080ba', // Southern Peach Crumble Bliss
  '6a3e37fee8d7ba1372e2072f', // Banana Split Bliss
  '6a7b92470796edccdb26af34', // Caramel Apple Bliss
];

// Special availability badges keyed by MenuItem id.
const AVAILABILITY_BADGES = {
  '6a3e3807f128347090f2090d': { label: 'Until Supplies Last', className: 'bg-smashie-yellow text-obsidian-roast' },
  '6a7b92470796edccdb26af34': { label: 'Limited Time', className: 'bg-midnight-cherry text-white' },
};

// Short display names (strip the "Milkshake" suffix for the card title).
const SHORT_NAMES = {
  '6a3e37fe23e413b185c3732a': 'Banana Pudding Bliss',
  '6a3e3807f128347090f2090d': 'Circus Cookie Bliss',
  '6a3e3805ff57925d93d080ba': 'Peach Crumble Bliss',
  '6a3e37fee8d7ba1372e2072f': 'Banana Split Bliss',
  '6a7b92470796edccdb26af34': 'Caramel Apple Bliss',
};

export default function PremiumShakesSection() {
  const { addItem, setIsCartOpen, orderingEnabled } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState(null);
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    Promise.all(PREMIUM_SHAKE_IDS.map((id) => base44.entities.MenuItem.get(id).catch(() => null)))
      .then((fetched) => {
        // Removed (is_hidden) premium shakes are excluded entirely; sold-out
        // ones stay visible as disabled "Sold Out" cards.
        setItems(fetched.filter(Boolean).filter((i) => i.is_hidden !== true));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCardClick = (item) => {
    if (!orderingEnabled) return;
    const hasModifiers = item.modifiers && item.modifiers.length > 0;
    if (hasModifiers) {
      setActiveItem(item);
    } else {
      addItem(item);
      setAddedId(item.id);
      setTimeout(() => setAddedId(null), 1200);
    }
  };

  const handleModalConfirm = (selectedMods, extraCost) => {
    addItem({ ...activeItem, price: activeItem.price + extraCost, selectedModifiers: selectedMods });
    setAddedId(activeItem.id);
    setActiveItem(null);
    setTimeout(() => setAddedId(null), 1200);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-gray-200 rounded-full animate-spin mx-auto" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <>
      {activeItem && (
        <ModifierModal
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onConfirm={handleModalConfirm}
        />
      )}

      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-midnight-cherry/10 text-midnight-cherry px-4 py-1.5 rounded-full text-xs font-heading uppercase tracking-widest mb-3">
            <Sparkles size={12} /> Premium Bliss Shakes
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast mb-2">SIGNATURE BLISS SHAKES</h2>
          <p className="text-muted-foreground text-sm">Our hand-crafted specialty blends — each one a limited-time treat.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {items.map((item) => {
            const badge = AVAILABILITY_BADGES[item.id];
            const shortName = SHORT_NAMES[item.id] || item.name.replace(/ Milkshake$/i, '');
            const isAdded = addedId === item.id;
            const soldOut = item.is_available === false;
            return (
              <button
                key={item.id}
                onClick={() => handleCardClick(item)}
                disabled={!orderingEnabled || soldOut}
                className={`card-diner overflow-hidden text-left group flex flex-col disabled:opacity-60 disabled:cursor-not-allowed ${
                  soldOut ? 'opacity-70' : ''
                }`}
              >
                {/* Image */}
                <div className="relative h-32 overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                        soldOut ? 'grayscale opacity-60' : ''
                      }`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">🥤</div>
                  )}
                  {soldOut ? (
                    <div className="absolute top-2 left-2 bg-obsidian-roast text-white text-[10px] font-heading px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Sold Out
                    </div>
                  ) : badge ? (
                    <div className={`absolute top-2 left-2 text-[10px] font-heading px-2 py-0.5 rounded-full uppercase tracking-wider ${badge.className}`}>
                      {badge.label}
                    </div>
                  ) : null}
                </div>

                {/* Content */}
                <div className="p-3 flex flex-col flex-1">
                  <p className="font-heading text-sm text-obsidian-roast leading-tight mb-1">{shortName}</p>
                  <p className="text-midnight-cherry font-heading text-base">${item.price.toFixed(2)}</p>
                  <div className="mt-auto pt-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-heading w-full justify-center py-2 rounded-xl transition-all ${
                      soldOut
                        ? 'bg-muted text-muted-foreground'
                        : isAdded
                          ? 'bg-midnight-cherry text-white'
                          : 'bg-patina-mint text-white'
                    }`}>
                      {soldOut ? 'Sold Out' : isAdded ? <><Check size={12} /> Added!</> : <><Plus size={12} /> Add</>}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}