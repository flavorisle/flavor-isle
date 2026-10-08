import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { FAMILY_BUNDLE, FAMILY_BUNDLE_SLOTS } from '@/config/familyBundle';
import { isFamilyBundleEnabled, buildSlotState, isBundleLine, getFamilyBundleDiscount } from '@/lib/familyBundle';
import FamilyBundleSlot from './FamilyBundleSlot';

// The School Night Lifesaver — pinned at the top of the ordering page, above
// every category section. Hidden entirely while FAMILY_BUNDLE_ENABLED is false.
export default function FamilyBundleCard({ items }) {
  const { addItem, cartItems, orderingEnabled, orderingClosedMessage, menuSetting } = useCart();
  const [config, setConfig] = useState({});
  const overrides = menuSetting?.modifier_overrides;

  const itemsById = useMemo(() => new Map((items || []).map((i) => [i.id, i])), [items]);
  const sides = useMemo(
    () => FAMILY_BUNDLE.sides.itemIds.map((id) => itemsById.get(id)).filter((i) => i && i.is_available !== false),
    [itemsById],
  );

  const required = useMemo(() => {
    const ids = [FAMILY_BUNDLE.burger.itemId, FAMILY_BUNDLE.mini.itemId, FAMILY_BUNDLE.drinks.itemId, FAMILY_BUNDLE.cake.itemId];
    return ids.every((id) => { const it = itemsById.get(id); return it && it.is_available !== false; }) && sides.length === 4;
  }, [itemsById, sides]);

  if (!isFamilyBundleEnabled() || !required) return null;

  const sideState = (slot) => ({ itemId: FAMILY_BUNDLE.sides.itemIds[0], ...buildSlotState(slot, sides[0], overrides) });
  const defaultState = (slot) => {
    if (slot.kind === 'side') return sideState(slot);
    const item = itemsById.get(FAMILY_BUNDLE[slot.kind === 'burger' ? 'burger' : slot.kind === 'drink' ? 'drinks' : slot.kind].itemId);
    return buildSlotState(slot, item, overrides);
  };

  const states = FAMILY_BUNDLE_SLOTS.map((slot) => ({ slot, state: config[slot.key] || defaultState(slot) }));
  const extras = states.reduce((sum, { state }) => sum + (Number(state.extraCost) || 0), 0);
  const bundleTotal = FAMILY_BUNDLE.price + extras;

  // The discount only exists once the lines are in the cart — this mirrors the
  // cart's own number so the customer sees the same figure before adding.
  const addedDiscount = getFamilyBundleDiscount(cartItems);
  const bundleInCart = (cartItems || []).some(isBundleLine);

  const handleAdd = () => {
    const bundleGroup = `${FAMILY_BUNDLE.id}-${Date.now()}`;
    for (const { slot, state } of states) {
      const item = slot.kind === 'side'
        ? itemsById.get(state.itemId) || sides[0]
        : itemsById.get(FAMILY_BUNDLE[slot.kind === 'burger' ? 'burger' : slot.kind === 'drink' ? 'drinks' : slot.kind].itemId);
      if (!item) continue;
      addItem({
        ...item,
        price: item.price + (Number(state.extraCost) || 0),
        selectedModifiers: state.selectedModifiers || [],
        bundleId: FAMILY_BUNDLE.id,
        bundleGroup,
        alwaysUnique: true,
      });
    }
  };

  const half = Math.ceil(states.length / 2);

  return (
    <section aria-label="Family bundle" className="mb-10">
      <div className="card-diner overflow-hidden border-2 border-smashie-yellow">
        <div className="bg-obsidian-roast px-5 py-5 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-heading uppercase tracking-widest text-[hsl(var(--primary))]">Family bundle</p>
            <h2 className="font-heading text-3xl text-white leading-tight">{FAMILY_BUNDLE.title}</h2>
            <p className="text-sm text-white/85 mt-1">{FAMILY_BUNDLE.subtitle}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-heading text-3xl text-smashie-yellow leading-none">{FAMILY_BUNDLE.flatLabel}</p>
            <p className="text-xs text-white/75 mt-1">{FAMILY_BUNDLE.priceNote}</p>
          </div>
        </div>

        <div className="p-5 grid gap-x-10 md:grid-cols-2">
          <div>
            {states.slice(0, half).map(({ slot, state }) => (
              <FamilyBundleSlot
                key={slot.key}
                slot={slot}
                item={itemsById.get(FAMILY_BUNDLE[slot.kind === 'burger' ? 'burger' : slot.kind === 'drink' ? 'drinks' : slot.kind]?.itemId)}
                sides={sides}
                state={state}
                modifierOverrides={overrides}
                disabled={!orderingEnabled}
                onConfigured={(next) => setConfig((prev) => ({ ...prev, [slot.key]: next }))}
              />
            ))}
          </div>
          <div>
            {states.slice(half).map(({ slot, state }) => (
              <FamilyBundleSlot
                key={slot.key}
                slot={slot}
                item={itemsById.get(FAMILY_BUNDLE[slot.kind === 'burger' ? 'burger' : slot.kind === 'drink' ? 'drinks' : slot.kind]?.itemId)}
                sides={sides}
                state={state}
                modifierOverrides={overrides}
                disabled={!orderingEnabled}
                onConfigured={(next) => setConfig((prev) => ({ ...prev, [slot.key]: next }))}
              />
            ))}
          </div>

          <div className="md:col-span-2 mt-5 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {extras > 0
                ? `$${FAMILY_BUNDLE.price.toFixed(2)} bundle + $${extras.toFixed(2)} extras. ${FAMILY_BUNDLE.aLaCarteNote}.`
                : `${FAMILY_BUNDLE.aLaCarteNote} — you save $3.59.`}
              {bundleInCart && addedDiscount > 0 ? ` Bundle already in your order: −$${addedDiscount.toFixed(2)}.` : ''}
            </p>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!orderingEnabled}
              title={!orderingEnabled ? orderingClosedMessage : ''}
              className={`w-full sm:w-auto px-6 py-3.5 font-heading text-sm inline-flex items-center justify-center gap-2 ${
                orderingEnabled ? 'btn-cherry chrome-hover' : 'rounded-full bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              <Plus size={16} />
              Add bundle to order · ${bundleTotal.toFixed(2)} + tax
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}