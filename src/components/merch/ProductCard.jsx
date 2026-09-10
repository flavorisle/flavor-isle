// Tasty Threads product card.
import React from 'react';
import MerchSocialShare from './MerchSocialShare';
import { ProductionTimeBadge } from './ProductionTimeNotice';
import { trackSelectItem, merchItemToGa4 } from '@/lib/ga4Ecommerce';

export default function ProductCard({ product, onClick }) {
  const fromLabel = product.fromPrice ? `$${product.fromPrice.toFixed(2)}` : '';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { trackSelectItem(merchItemToGa4(product), { item_list_id: 'merch', item_list_name: 'Tasty Threads' }); onClick(product); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trackSelectItem(merchItemToGa4(product), { item_list_id: 'merch', item_list_name: 'Tasty Threads' }); onClick(product); } }}
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
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur text-patina-mint text-[10px] font-heading uppercase tracking-widest px-2 py-1 rounded-full shadow-sm">
          Made to order
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-heading text-base text-obsidian-roast leading-tight">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
        )}
        <div className="mt-3 mb-3">
          <ProductionTimeBadge />
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="text-xs font-heading text-midnight-cherry uppercase tracking-widest group-hover:gap-2 inline-flex items-center gap-1 transition-all">
            View options →
          </span>
          <MerchSocialShare product={product} />
        </div>
      </div>
    </div>
  );
}