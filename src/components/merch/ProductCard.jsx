// Tasty Threads product card.
import React from 'react';
import MerchSocialShare from './MerchSocialShare';

export default function ProductCard({ product, onClick }) {
  const fromLabel = product.fromPrice ? `$${product.fromPrice.toFixed(2)}` : '';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(product)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(product); } }}
      className="card-diner overflow-hidden text-left flex flex-col group cursor-pointer"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.thumbnail_url ? (
          <img
            src={product.thumbnail_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
        )}
        {fromLabel && (
          <span className="absolute bottom-3 right-3 bg-midnight-cherry text-white text-xs font-heading px-3 py-1 rounded-full">
            from {fromLabel}
          </span>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-heading text-base text-obsidian-roast leading-tight">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs font-heading text-midnight-cherry uppercase tracking-widest group-hover:gap-2 inline-flex items-center gap-1 transition-all">
            View options →
          </span>
          <MerchSocialShare product={product} />
        </div>
      </div>
    </div>
  );
}