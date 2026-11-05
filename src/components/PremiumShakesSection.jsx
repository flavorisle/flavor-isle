import React, { useState, useEffect } from 'react';
import { Plus, Check, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { applyModifierOverrides } from '@/lib/modifierOverrides';
import ModifierModal from './ModifierModal';
import { withShakeFlavorLevel } from './ShakeFlavorControl';
import { optimizedImageUrl } from '@/lib/utils';
import { BLISS_CATEGORY, SKIP_ITEM_NAMES } from '@/lib/buildCards';
import { blissBadge } from '@/lib/blissBadge';

// The specialty "Bliss" shakes ARE Square's "Blend & Bliss" items — the same
// records the online menu and the print cards read. Nothing is listed by hand,
// so a flavor added or renamed in Square shows up here with its own name,
// price and modifier groups. Hidden (is_hidden) entries stay out until the crew
// makes them available again.
const badgeKey = (item) => item.name.replace(/\s*Milkshake$/i, '');

// The pill is computed from the item itself (sold out → trending label → added
// in the last 45 days), so no flavor name appears in any badge logic.

export default function PremiumShakesSection({ autoOpenId }) {
  const { addItem, setIsCartOpen, orderingEnabled, menuSetting } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeItem, setActiveItem] = useState(null);
  const [addedId, setAddedId] = useState(null);

  useEffect(() => {
    base44.entities.MenuItem.list()
      .then((all) => {
        // Every Square "Blend & Bliss" item, minus the ones the crew hid and the
        // generic "Specialty Milkshakes" placeholder. Sold-out flavors stay
        // visible as disabled "Sold Out" cards.
        const skip = new Set(SKIP_ITEM_NAMES.map((n) => String(n).trim().toLowerCase()));
        const visible = (all || [])
          .filter((i) => i.square_category === BLISS_CATEGORY)
          .filter((i) => i.is_hidden !== true)
          .filter((i) => !skip.has(String(i.name || '').trim().toLowerCase()))
          .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        setItems(visible);
        // Deep-link from the Caramel Apple Bliss pop-up: auto-open the size
        // picker for the requested shake once it's loaded and still available.
        if (autoOpenId) {
          const target = visible.find((i) => i.id === autoOpenId);
          if (target && target.is_available !== false && target.modifiers?.length) {
            setActiveItem(target);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [autoOpenId]);

  const handleCardClick = (item) => {
    if (!orderingEnabled) return;
    // Only open the customizer when the item still has choices after the admin's
    // modifier controls (hidden groups/options) are applied.
    const hasModifiers = applyModifierOverrides(item.modifiers, menuSetting?.modifier_overrides).length > 0;
    if (hasModifiers) {
      setActiveItem(item);
    } else {
      addItem(item);
      setAddedId(item.id);
      setTimeout(() => setAddedId(null), 1200);
    }
  };

  const handleModalConfirm = (selectedMods, extraCost, _label, _allToppings, _comboItems, allergyNote, coreLevel) => {
    addItem({ ...activeItem, name: withShakeFlavorLevel(activeItem.name, coreLevel), flavorLevel: coreLevel || undefined, price: activeItem.price + extraCost, selectedModifiers: selectedMods, allergyNote: allergyNote || undefined });
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
            const shortName = badgeKey(item);
            const badge = blissBadge(item);
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
                  {item.image_url_opt || item.image_url ? (
                    <img
                      src={optimizedImageUrl(item.image_url_opt || item.image_url, 500, 500)}
                      alt={item.name}
                      width="500"
                      height="500"
                      loading="lazy"
                      decoding="async"
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