// Tasty Threads product detail modal.
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Check, ShoppingBag } from 'lucide-react';

export default function ProductDetailModal({ product, onClose, onAdd }) {
  const variants = product?.variants || [];
  const hasColor = variants.some(v => v.color);
  const colors = hasColor ? Array.from(new Set(variants.map(v => v.color).filter(Boolean))) : [];

  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);

  useEffect(() => {
    setActiveImage(0);
    const firstInStock = product?.variants?.find(v => v.in_stock);
    setSelectedVariant(firstInStock || product?.variants?.[0] || null);
  }, [product]);

  useEffect(() => {
    if (hasColor && !selectedColor && colors.length) setSelectedColor(colors[0]);
  }, [hasColor, selectedColor, colors]);

  if (!product) return null;

  const images = product.images?.length ? product.images : (product.thumbnail_url ? [product.thumbnail_url] : []);
  const hasSize = variants.some(v => v.size);

  const visibleVariants = hasColor
    ? variants.filter(v => v.color === selectedColor)
    : variants;

  const chooseVariant = (v) => {
    setSelectedVariant(v);
    if (v.color && v.color !== selectedColor) setSelectedColor(v.color);
  };

  const variantLabel = (v) => {
    const parts = [v.color, v.size].filter(Boolean);
    return parts.length ? parts.join(' · ') : v.name;
  };

  const handleAdd = () => {
    if (!selectedVariant) return;
    onAdd({
      productId: product.id,
      name: product.name,
      variantName: variantLabel(selectedVariant),
      sku: selectedVariant.sku,
      sync_variant_id: selectedVariant.id,
      price: selectedVariant.price,
      image: selectedVariant.image || product.thumbnail_url,
      size: selectedVariant.size,
      color: selectedVariant.color,
      quantity: 1,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-float-lg w-full sm:max-w-3xl h-[90dvh] sm:h-auto sm:max-h-[88dvh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border flex-shrink-0">
          <div className="flex-1 mr-4">
            <h3 className="font-heading text-xl text-obsidian-roast">{product.name}</h3>
            {product.description && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{product.description}</p>
            )}
          </div>
          <button onClick={onClose} className="tap-44 flex items-center justify-center hover:bg-muted rounded-full transition-colors flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-5">
            {/* Images */}
            <div>
              <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
                {images[activeImage] ? (
                  <img src={images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImage(i)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${activeImage === i ? 'border-midnight-cherry' : 'border-border'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Variant selection */}
            <div className="flex flex-col">
              {hasColor && (
                <div className="mb-5">
                  <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast mb-3">Color</h4>
                  <div className="flex flex-wrap gap-2">
                    {colors.map(c => (
                      <button
                        key={c}
                        onClick={() => { setSelectedColor(c); const first = variants.find(v => v.color === c && v.in_stock) || variants.find(v => v.color === c); if (first) setSelectedVariant(first); }}
                        className={`px-4 py-2 rounded-full border-2 text-sm font-body transition-all ${selectedColor === c ? 'border-midnight-cherry bg-midnight-cherry/5 text-midnight-cherry' : 'border-border text-obsidian-roast hover:border-midnight-cherry/40'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-5">
                <h4 className="font-heading text-sm uppercase tracking-widest text-obsidian-roast mb-3">
                  {hasColor && hasSize ? 'Size' : 'Option'}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {visibleVariants.map(v => {
                    const isSelected = selectedVariant?.id === v.id;
                    return (
                      <button
                        key={v.id}
                        disabled={!v.in_stock}
                        onClick={() => chooseVariant(v)}
                        className={`px-4 py-2 rounded-full border-2 text-sm font-body transition-all ${!v.in_stock ? 'border-border bg-muted text-muted-foreground/50 line-through cursor-not-allowed' : isSelected ? 'border-midnight-cherry bg-midnight-cherry text-white' : 'border-border text-obsidian-roast hover:border-midnight-cherry/40'}`}
                      >
                        {hasSize ? v.size || v.name : variantLabel(v)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-auto">
                {selectedVariant && (
                  <p className="font-heading text-2xl text-midnight-cherry mb-3">
                    ${selectedVariant.price.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex-shrink-0 bg-white safe-bottom">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedVariant || !selectedVariant.in_stock}
            className="btn-cherry chrome-hover w-full py-4 font-heading text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {selectedVariant?.in_stock === false ? (
              'Out of Stock'
            ) : (
              <><Plus size={16} /> Add to Cart{selectedVariant ? ` — $${selectedVariant.price.toFixed(2)}` : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}