import React from 'react';
import { islePhotos } from '@/components/cinematic/photos';

export default function FoodRail() {
  return (
    <section aria-label="Food from the Flavor Isle kitchen" className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-8">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[islePhotos.burger, islePhotos.chickenFries, islePhotos.pickles].map(photo => (
          <figure key={photo.url} className="overflow-hidden rounded-xl bg-patina-mint">
            <img src={photo.url} alt={photo.alt} width="640" height="480" loading="lazy" decoding="async"
              className="w-full aspect-[4/3] object-cover motion-safe:transition-transform motion-safe:duration-500 hover:scale-105" />
            <figcaption className="bg-card text-card-foreground font-body text-sm px-2 py-2 hidden sm:block">{photo.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}