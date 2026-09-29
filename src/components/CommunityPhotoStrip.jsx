import React from 'react';
import { issue23Photos } from '@/lib/issue23Photos';

const photos = [
  { src: issue23Photos.ecto, label: 'Ghostbusters Ecto-1 visits Flavor Isle' },
  { src: issue23Photos.corvette, label: 'Corvette show day at Flavor Isle' },
  { src: issue23Photos.anniversary, label: 'The 50th anniversary crowd' },
];

export default function CommunityPhotoStrip() {
  return <section aria-label="Community at Flavor Isle" className="px-4 sm:px-6 py-8 bg-vanilla-malt">
    <div className="max-w-6xl mx-auto grid grid-cols-3 gap-3 sm:gap-4">
      {photos.map(({ src, label }) => <figure key={src} className="min-w-0">
        <img src={src} alt={label} loading="lazy" className="w-full aspect-[4/3] object-cover rounded-xl" />
        <figcaption className="text-xs sm:text-sm text-muted-foreground mt-2">{label}</figcaption>
      </figure>)}
    </div>
  </section>;
}