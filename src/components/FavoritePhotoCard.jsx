import React from 'react';
import { Link } from 'react-router-dom';
import { productPath } from '@/lib/productSlug';

export default function FavoritePhotoCard({ item }) {
  return (
    <Link to={productPath(item)} className="block card-diner overflow-hidden group focus-visible:outline-2 focus-visible:outline-primary" aria-label={`View ${item.name}`}>
      <div className="aspect-[4/3] overflow-hidden">
        <img src={item.image_url} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
      </div>
      <div className="p-4 flex items-start justify-between gap-2">
        <span className="font-heading text-lg text-obsidian-roast leading-tight">{item.name}</span>
        <span className="font-heading text-lg text-midnight-cherry whitespace-nowrap">${item.price.toFixed(2)}</span>
      </div>
    </Link>
  );
}