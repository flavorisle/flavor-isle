import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ShoppingBag, Plus, Minus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { resolveFlavorName, resolveFlavorEmoji } from '@/lib/shakeConfig';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

// The main Square "Milkshake" item — every shake is built from this one catalog
// object so the POS ticket stays clean and pricing stays in sync with Square.
export const MILKSHAKE_ITEM_ID = '6a3e25598a5d91912096d635';
export const MILKSHAKE_SQUARE_ID = 'FRPDBY4XY74IMUQLTG43JAJN';

// Size prices are all-in: they already include one flavor. Extra flavors,
// thick consistency, and toppings are added on top.
export const SHAKE_SIZE_PRICES = { small: 5.49, large: 5.99 };

const ICE_CREAM_BASE_OPTIONS = [
  { id: 'vanilla', name: 'Vanilla', emoji: '🍦', desc: 'Classic base' },
  { id: 'chocolate', name: 'Chocolate', emoji: '🍫', desc: 'Rich cocoa base' },
];

const CONSISTENCY_OPTIONS = [
  { id: 'thin', name: 'Thin', price: 0, emoji: '💧', desc: 'Sippable & smooth' },
  { id: 'regular', name: 'Regular', price: 0, emoji: '🥤', desc: 'The classic' },
  { id: 'thick', name: 'Thick', price: 0.5, emoji: '🥄', desc: 'Extra-rich & spoonable' },
];

// Customizer modal for a single milkshake flavor. The clicked flavor is
// pre-selected; the customer picks size, consistency, extra flavors, and
// toppings before adding to the cart.
export default function ShakeCustomizer({ open, onClose, primaryFlavor, shakeItem, config }) {
  const { addItem, setIsCartOpen } = useCart();
  const [size, setSize] = useState(null);
  const [iceCreamBase, setIceCreamBase] = useState(ICE_CREAM_BASE_OPTIONS[0]);
  const [consistency, setConsistency] = useState(CONSISTENCY_OPTIONS[1]);
  const [extraFlavors, setExtraFlavors] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Reset selections whenever a new flavor card opens the modal.
  useEffect(() => {
    if (open) {
      setSize(null);
      setIceCreamBase(null);
      setConsistency(null);
      setExtraFlavors([]);
      setToppings([]);
      setQuantity(1);
      setAdded(false);
    }
  }, [open, primaryFlavor?.id]);

  if (!open || !primaryFlavor || !shakeItem) return null;

  const groups = shakeItem.modifiers || [];
  const findGroup = (kw) => groups.find((g) => (g.name || '').toLowerCase().includes(kw));
  const sizeOpts = (findGroup('size')?.modifiers || []).filter((m) => !m.sold_out);
  const flavorOpts = (findGroup('flavor')?.modifiers || []).filter((m) => !m.sold_out && m.id !== primaryFlavor.id);
  const toppingOpts = (findGroup('topping')?.modifiers || []).filter((m) => !m.sold_out);

  const basePrice = shakeItem.price ?? 3.59;
  const resolvedName = resolveFlavorName(primaryFlavor.id, primaryFlavor.name, config);
  const resolvedEmoji = resolveFlavorEmoji(primaryFlavor.id, config);

  // Resolve the all-in size price (includes one flavor) by matching the
  // Square size option name. Falls back to the old base+difference model for
  // any unrecognized size.
  const sizeBasePrice = (opt) => {
    const n = (opt?.name || '').toLowerCase();
    if (n.includes('small')) return SHAKE_SIZE_PRICES.small;
    if (n.includes('large')) return SHAKE_SIZE_PRICES.large;
    return basePrice + (opt?.price || 0) + (primaryFlavor?.price || 0);
  };

  const toggleMulti = (list, setList, opt) => {
    setList((prev) => (prev.some((s) => s.id === opt.id) ? prev.filter((s) => s.id !== opt.id) : [...prev, opt]));
  };

  const unitPrice =
    sizeBasePrice(size) +
    (consistency?.price || 0) +
    extraFlavors.reduce((s, f) => s + f.price, 0) +
    toppings.reduce((s, t) => s + t.price, 0);

  const totalPrice = unitPrice * quantity;

  const allFlavorNames = [resolvedName, ...extraFlavors.map((f) => resolveFlavorName(f.id, f.name, config))];
  const baseSuffix = iceCreamBase ? ` (${iceCreamBase.name} Ice Cream)` : '';
  const cartName = `${allFlavorNames.join(' + ')} Milkshake${baseSuffix}`;

  const handleAddToCart = () => {
    const selectedModifiers = [
      ...(size ? [{ id: size.id, name: size.name, price: size.price }] : []),
      ...(iceCreamBase ? [{ name: `${iceCreamBase.name} Ice Cream`, price: 0 }] : []),
      ...(consistency ? [{ name: `${consistency.name} Shake`, price: consistency.price }] : []),
      { id: primaryFlavor.id, name: resolvedName, price: primaryFlavor.price },
      ...extraFlavors.map((f) => ({ id: f.id, name: resolveFlavorName(f.id, f.name, config), price: f.price })),
      ...toppings.map((t) => ({ id: t.id, name: t.name, price: t.price })),
    ];

    const cartItem = {
      id: MILKSHAKE_ITEM_ID,
      catalog_object_id: MILKSHAKE_SQUARE_ID,
      isBuildShake: true,
      name: cartName,
      price: unitPrice,
      category: 'Shakes',
      selectedModifiers,
    };
    // addItem starts each line at qty 1 and merges identical builds, so calling
    // it N times yields one line with quantity N (or separate lines for
    // different modifier combos).
    for (let i = 0; i < quantity; i++) addItem(cartItem);

    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
      setIsCartOpen(true);
    }, 900);
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] bg-vanilla-malt rounded-t-3xl sm:rounded-3xl shadow-float-lg flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{resolvedEmoji}</span>
            <div>
              <h2 className="font-heading text-lg text-obsidian-roast leading-none">{resolvedName} Milkshake</h2>
              <p className="text-xs text-muted-foreground mt-0.5">from ${SHAKE_SIZE_PRICES.small.toFixed(2)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Size */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Size</p>
            <div className="grid grid-cols-2 gap-3">
              {sizeOpts.map((opt) => {
                const selected = size?.id === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSize(opt)}
                    className={`relative p-4 rounded-2xl border-2 transition-all text-center ${
                      selected ? 'border-midnight-cherry bg-midnight-cherry/5 shadow-float' : 'border-border bg-white hover:border-midnight-cherry/50'
                    }`}
                  >
                    <p className="font-heading text-obsidian-roast text-base">{opt.name}</p>
                    <p className="text-xs text-midnight-cherry font-semibold mt-1">${sizeBasePrice(opt).toFixed(2)}</p>
                    {selected && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-midnight-cherry rounded-full flex items-center justify-center">
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ice Cream Base */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Ice Cream Base <span className="normal-case font-body text-muted-foreground/70">(optional)</span></p>
            <Select value={iceCreamBase?.id} onValueChange={(v) => setIceCreamBase(ICE_CREAM_BASE_OPTIONS.find((o) => o.id === v))}>
              <SelectTrigger className="h-12 rounded-2xl border-2 border-border bg-white font-body text-sm text-obsidian-roast">
                <SelectValue placeholder="Standard vanilla" />
              </SelectTrigger>
              <SelectContent>
                {ICE_CREAM_BASE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.emoji} {opt.name} — {opt.desc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Consistency */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Consistency <span className="normal-case font-body text-muted-foreground/70">(optional)</span></p>
            <Select value={consistency?.id} onValueChange={(v) => setConsistency(CONSISTENCY_OPTIONS.find((o) => o.id === v))}>
              <SelectTrigger className="h-12 rounded-2xl border-2 border-border bg-white font-body text-sm text-obsidian-roast">
                <SelectValue placeholder="Regular" />
              </SelectTrigger>
              <SelectContent>
                {CONSISTENCY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.emoji} {opt.name}{opt.price > 0 ? ` (+$${opt.price.toFixed(2)})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Extra flavors */}
          {flavorOpts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Add Another Flavor</p>
              <div className="flex flex-wrap gap-2">
                {flavorOpts.map((opt) => {
                  const selected = extraFlavors.some((s) => s.id === opt.id);
                  const name = resolveFlavorName(opt.id, opt.name, config);
                  const emoji = resolveFlavorEmoji(opt.id, config);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleMulti(extraFlavors, setExtraFlavors, opt)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 transition-all font-body text-sm font-semibold ${
                        selected ? 'border-midnight-cherry bg-midnight-cherry text-white' : 'border-border bg-white text-obsidian-roast hover:border-midnight-cherry/50'
                      }`}
                    >
                      <span className="text-base leading-none">{emoji}</span>
                      {name}
                      <span className={`text-xs ${selected ? 'text-red-200' : 'text-muted-foreground'}`}>+${opt.price.toFixed(2)}</span>
                      {selected && <Check size={13} className="ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Toppings */}
          {toppingOpts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Add a Topping</p>
              <div className="flex flex-wrap gap-2">
                {toppingOpts.map((opt) => {
                  const selected = toppings.some((s) => s.id === opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleMulti(toppings, setToppings, opt)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl border-2 transition-all font-body text-sm font-semibold ${
                        selected ? 'border-midnight-cherry bg-midnight-cherry text-white' : 'border-border bg-white text-obsidian-roast hover:border-midnight-cherry/50'
                      }`}
                    >
                      {opt.name}
                      <span className={`text-xs ${selected ? 'text-red-200' : 'text-muted-foreground'}`}>+${opt.price.toFixed(2)}</span>
                      {selected && <Check size={13} className="ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-white border-t border-border space-y-3 safe-bottom">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-midnight-cherry hover:text-white transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="font-heading text-lg text-obsidian-roast w-6 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-midnight-cherry hover:text-white transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="text-right">
              <p className="font-heading text-2xl text-obsidian-roast leading-none">${totalPrice.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{cartName}</p>
            </div>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!size}
            className={`btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 ${
              !size ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          >
            {added ? (
              <>
                <Check size={16} /> Added!
              </>
            ) : (
              <>
                <ShoppingBag size={16} /> {!size ? 'Pick a size' : `Add to Order — $${totalPrice.toFixed(2)}`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}