import React from 'react';
import { optimizedImageUrl } from '@/lib/utils';

// Three food shots from the Isle, featured outside the gallery: on the About
// page and on the What to Expect page. Kept in one place so both pages always
// show the same photos and captions.
export const FOOD_PHOTOS = [
  {
    url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/378e85aaa_20260926_010715000_iOS.jpg',
    alt: 'Cheeseburger topped with sautéed mushrooms, fresh off the grill',
    caption: 'Mushroom cheeseburger, hand-patted to order',
  },
  {
    url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/82e04e92e_20260926_010823000_iOS.jpg',
    alt: 'Basket of breaded fried pickle slices served in a paper boat',
    caption: 'Fried pickles, breaded fresh and fried to order',
  },
  {
    url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/529c20772_20260926_010753000_iOS.jpg',
    alt: 'Pile of seasoned curly fries on parchment paper with a fork',
    caption: 'Curly fries, seasoned and piled high',
  },
];

export default function FoodPhotoRow({ heading, subtext, className = '' }) {
  return (
    <div className={className}>
      {(heading || subtext) && (
        <div className="text-center mb-8">
          {heading && (
            <h2 className="font-heading uppercase text-3xl sm:text-4xl text-obsidian-roast leading-tight">
              {heading}
            </h2>
          )}
          {subtext && (
            <p className="text-muted-foreground mt-3 text-sm max-w-xl mx-auto">{subtext}</p>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {FOOD_PHOTOS.map((photo) => (
          <figure key={photo.url}>
            <img
              src={optimizedImageUrl(photo.url, 500, 500)}
              alt={photo.alt}
              width="500"
              height="500"
              loading="lazy"
              decoding="async"
              className="w-full aspect-[4/3] sm:aspect-square object-cover rounded-3xl shadow-float"
            />
            <figcaption className="mt-3 text-sm text-muted-foreground">{photo.caption}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}