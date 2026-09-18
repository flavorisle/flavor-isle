import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ShoppingBag, Plus, Minus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { resolveFlavorName, resolveFlavorEmoji, flavorNameFromItem, flavorEmojiByName } from '@/lib/shakeConfig';

// Legacy: the old single "Milkshake" item. Kept for backwards compatibility
// with AdminShakeManager, which still manages flavor name/emoji overrides
// through this item's FLAVOR CHOICE modifier list.
export const MILKSHAKE_ITEM_ID = '6a3e25598a5d91912096d635';

// Customizer modal for an individual milkshake item. The customer picks size,
// base, and extra flavors before adding to the cart. All options come live
// from the item's own Square modifier lists.
export default function ShakeCustomizer({ open, onClose, shakeItem, config }) {
  const { addItem, setIsCartOpen } = useCart();
  const [size, setSize] = useState(null);
  const [base, setBase] = useState(null);
  const [extraFlavors, setExtraFlavors] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (open) {
      setSize(null);
      setBase(null);
      setExtraFlavors([]);
      setQuantity(1);
      setAdded(false);
    }
  }, [open, shakeItem?.id]);

  if (!open || !shakeItem) return null;

  const groups = shakeItem.modifiers || [];
  const findGroup = (kw) => groups.find((g) => (g.name || '').toLowerCase().includes(kw));
  const sizeOpts = (findGroup('size')?.modifiers || []).filter((m) => !m.sold_out);
  const baseOpts = (findGroup('base')?.modifiers || []).filter((m) => !m.sold_out);
  const flavorOpts = (findGroup('flavor')?.modifiers || []).filter((m) => !m.sold_out);

  const flavorName = flavorNameFromItem(shakeItem.name);
  const flavorEmoji = flavorEmojiByName(flavorName);

  // Same-flavor matching ignores the "Real Fruit"/"Crushed" wording, since all
  // our fruit is real fruit — a Banana shake must not also charge for
  // "Real Fruit Banana".
  const coreFlavor = (n) =>
    (n || '').toLowerCase().replace(/\b(real fruit|crushed)\b/g, '').replace(/\s+/g, ' ').trim();

  // Extra flavor options from the "Add as many flavors" list, excluding the
  // shake's own flavor (you're already getting it).
  const allExtraOpts = flavorOpts.filter(
    (m) => coreFlavor(resolveFlavorName(m.id, m.name, config)) !== coreFlavor(flavorName)
  );

  const basePrice = shakeItem.price ?? 5;

  const sizeBasePrice = (opt) => basePrice + (opt?.price || 0);

  const fromPrice = sizeOpts.length
    ? Math.min(...sizeOpts.map((o) => sizeBasePrice(o)))
    : basePrice;

  const toggleMulti = (list, setList, opt) => {
    setList((prev) => (prev.some((s) => s.id === opt.id) ? prev.filter((s) => s.id !== opt.id) : [...prev, opt]));
  };

  const unitPrice =
    basePrice +
    (size?.price || 0) +
    (base?.price || 0) +
    extraFlavors.reduce((s, f) => s + f.price, 0);

  const totalPrice = unitPrice * quantity;

  const extraFlavorNames = extraFlavors.map((f) => resolveFlavorName(f.id, f.name, config));
  const allFlavorNames = [flavorName, ...extraFlavorNames];
  // Only call out the base when it differs from the shake's own flavor —
  // otherwise it reads "Vanilla Milkshake (Vanilla)" and confuses the crew.
  // The ice cream base already prints in the modifier line, so it never goes in
  // the item name — "Banana Milkshake (Vanilla) (…, Vanilla Ice Cream)" read as
  // redundant on tickets.
  const cartName = `${allFlavorNames.join(' + ')} Milkshake`;

  const handleAddToCart = () => {
    const selectedModifiers = [
      ...(size ? [{ id: size.id, name: size.name, price: size.price }] : []),
      ...(base ? [{ id: base.id, name: resolveFlavorName(base.id, base.name, config), price: base.price }] : []),
      ...extraFlavors.map((f) => ({ id: f.id, name: resolveFlavorName(f.id, f.name, config), price: f.price })),
    ];

    const cartItem = {
      id: shakeItem.id,
      square_item_id: shakeItem.square_item_id,
      catalog_object_id: shakeItem.square_item_id,
      name: cartName,
      price: unitPrice,
      category: 'Shakes',
      image_url: shakeItem.image_url || '',
      selectedModifiers,
    };
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
            <span className="text-3xl">{flavorEmoji}</span>
            <div>
              <h2 className="font-heading text-lg text-obsidian-roast leading-none">{flavorName} Milkshake</h2>
              <p className="text-xs text-muted-foreground mt-0.5">from ${fromPrice.toFixed(2)}</p>
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
          {baseOpts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Ice Cream Base</p>
              <div className="grid grid-cols-3 gap-3">
                {baseOpts.map((opt) => {
                  const selected = base?.id === opt.id;
                  const name = resolveFlavorName(opt.id, opt.name, config).replace(/ Ice Cream/i, '');
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setBase(selected ? null : opt)}
                      className={`p-3 rounded-2xl border-2 transition-all text-center ${
                        selected ? 'border-midnight-cherry bg-midnight-cherry/5 shadow-float' : 'border-border bg-white hover:border-midnight-cherry/50'
                      }`}
                    >
                      <p className="font-heading text-obsidian-roast text-sm">{name}</p>
                      {opt.price > 0 && <p className="text-xs text-midnight-cherry font-semibold mt-0.5">+${opt.price.toFixed(2)}</p>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Extra flavors */}
          {allExtraOpts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Add Another Flavor</p>
              <div className="flex flex-wrap gap-2">
                {allExtraOpts.map((opt) => {
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