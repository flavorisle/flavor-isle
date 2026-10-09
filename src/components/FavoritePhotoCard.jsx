import React from 'react';
import { Link } from 'react-router-dom';
import { productPath } from '@/lib/productSlug';
import { optimizedImageUrl } from '@/lib/utils';

export default function FavoritePhotoCard({ item }) {
  return (
    <Link to={productPath(item)} className="block card-diner overflow-hidden group focus-visible:outline-2 focus-visible:outline-primary" aria-label={`View ${item.name}`}>
      <div className="aspect-[4/3] overflow-hidden">
        <img src={optimizedImageUrl(item.image_url_opt || item.image_url, 500, 500)} alt={item.name} width="500" height="500" loading="lazy" decoding="async" className="w-full h-full object-cover" />
      </div>
      <div className="p-4 flex items-start justify-between gap-2">
        <span className="font-heading text-lg text-obsidian-roast leading-tight">{item.name}</span>
        <span className="font-heading text-lg text-midnight-cherry whitespace-nowrap">${item.price.toFixed(2)}</span>
      </div>
    </Link>
  );
}