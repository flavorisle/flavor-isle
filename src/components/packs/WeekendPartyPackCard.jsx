import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { WEEKEND_PARTY_PACK, WEEKEND_PARTY_PACK_SLOTS } from '@/config/weekendPartyPack';
import { isWeekendPartyPackEnabled, packSeasonOption, packSizeOption } from '@/lib/weekendPartyPack';
import { optimizedImageUrl } from '@/lib/utils';
import PackSlotSelect from './PackSlotSelect';

// The Weekend Party Pack — pinned at the top of the ordering page, above every
// category section. Hidden entirely while WEEKEND_PARTY_PACK_ENABLED is false.
// The cart charges the full a-la-carte prices and the fixed $41.99 pack price
// comes off as the bundle discount, recomputed on the server.
export default function WeekendPartyPackCard({ items }) {
  const { addItem, orderingEnabled, orderingClosedMessage } = useCart();
  const itemsById = useMemo(() => new Map((items || []).map((i) => [i.id, i])), [items]);
  const defaultPicks = useMemo(() => ({
    'fry-1': WEEKEND_PARTY_PACK.fries.itemIds[0],
    'fry-2': WEEKEND_PARTY_PACK.fries.itemIds[1],
    side: WEEKEND_PARTY_PACK.sides.itemIds[0],
    'shake-1': WEEKEND_PARTY_PACK.shakes.itemIds[0],
    'shake-2': WEEKEND_PARTY_PACK.shakes.itemIds[1],
    'shake-3': WEEKEND_PARTY_PACK.shakes.itemIds[2],
  }), []);
  const [picks, setPicks] = useState(defaultPicks);

  if (!isWeekendPartyPackEnabled()) return null;

  const available = (id) => {
    const item = itemsById.get(id);
    return !!item && item.is_available !== false;
  };
  const required = [
    WEEKEND_PARTY_PACK.mini.itemId,
    ...WEEKEND_PARTY_PACK.fries.itemIds,
    ...WEEKEND_PARTY_PACK.sides.itemIds,
    ...WEEKEND_PARTY_PACK.shakes.itemIds,
  ].every(available);
  if (!required) return null;

  const handleAdd = () => {
    const bundleGroup = `${WEEKEND_PARTY_PACK.id}-${Date.now()}`;
    const base = {
      bundleId: WEEKEND_PARTY_PACK.id,
      bundleGroup,
      bundleName: WEEKEND_PARTY_PACK.title,
      alwaysUnique: true,
    };

    // The twelve minis are ONE line at quantity 12, priced from the live item.
    const mini = itemsById.get(WEEKEND_PARTY_PACK.mini.itemId);
    addItem({
      ...mini,
      selectedModifiers: [],
      initialQuantity: WEEKEND_PARTY_PACK.mini.quantity,
      ...base,
    });

    // Fries keep their REGULAR seasoning, shakes their 14 oz size — both read
    // from the item's own modifier list, at $0, so the pack price holds.
    for (const slot of WEEKEND_PARTY_PACK_SLOTS) {
      const item = itemsById.get(picks[slot.key]);
      if (!item) continue;
      const seasoning = slot.kind === 'fry' ? packSeasonOption(item) : null;
      const size = slot.kind === 'shake' ? packSizeOption(item) : null;
      addItem({
        ...item,
        selectedModifiers: [seasoning, size].filter(Boolean),
        ...base,
      });
    }
  };

  return (
    <section aria-label="Weekend Party Pack" className="mb-8">
      <div className="card-diner overflow-hidden border-2 border-smashie-yellow">
        <div className="bg-obsidian-roast px-5 py-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-heading uppercase tracking-widest text-[hsl(var(--primary))]">Party pack</p>
            <h2 className="font-heading text-3xl text-white leading-tight">Weekend Party Pack</h2>
            <p className="text-sm text-white/85 mt-1">{WEEKEND_PARTY_PACK.subtitle}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-heading text-3xl text-smashie-yellow leading-none">$41.99</p>
            <p className="text-xs text-white/75 mt-1">{WEEKEND_PARTY_PACK.priceNote}</p>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[13rem,1fr]">
          <img
            src={optimizedImageUrl(WEEKEND_PARTY_PACK.image_url, 520, 520)}
            alt={WEEKEND_PARTY_PACK.image_alt}
            width="520"
            height="520"
            loading="lazy"
            decoding="async"
            className="w-full h-40 sm:h-full object-cover rounded-xl"
          />

          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              {WEEKEND_PARTY_PACK_SLOTS.map((slot) => (
                <PackSlotSelect
                  key={slot.key}
                  label={slot.label}
                  itemIds={slot.itemIds}
                  itemsById={itemsById}
                  value={picks[slot.key]}
                  disabled={!orderingEnabled}
                  onChange={(id) => setPicks((prev) => ({ ...prev, [slot.key]: id }))}
                />
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Mix or match any two fries. {WEEKEND_PARTY_PACK.pickupNote}
            </p>

            <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {WEEKEND_PARTY_PACK.aLaCarteNote} — you save ${WEEKEND_PARTY_PACK.savings.toFixed(2)}.
              </p>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!orderingEnabled}
                title={!orderingEnabled ? orderingClosedMessage : ''}
                className={`w-full sm:w-auto px-6 py-3.5 font-heading text-sm inline-flex items-center justify-center gap-2 ${
                  orderingEnabled
                    ? 'btn-cherry chrome-hover'
                    : 'rounded-full bg-muted text-muted-foreground cursor-not-allowed'
                }`}
              >
                <Plus size={16} />
                Add pack to order · $41.99 + tax
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}