import React from 'react';
import { optimizedImageUrl } from '@/lib/utils';

const photo = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7c655b439_IMG_8923.jpg';

export default function ReviewsHero() {
  return (
    <section className="relative isolate min-h-[78svh] flex items-end overflow-hidden bg-patina-mint text-white">
      <img src={optimizedImageUrl(photo, 1600, 900)} alt="Guests gathered outside under the Flavor Isle sign" width="1600" height="900" loading="eager" fetchPriority="high" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-patina-mint/60" aria-hidden="true" />
      <div className="relative max-w-6xl mx-auto w-full px-5 sm:px-10 pb-16 pt-32">
        <p className="font-heading text-sm tracking-widest text-smashie-yellow uppercase">Flavor Isle · Smiths Grove, Kentucky</p>
        <h1 className="font-heading text-5xl sm:text-7xl leading-none max-w-3xl mt-3">Real people, real reactions.</h1>
        <p className="text-lg mt-4 max-w-xl">Food lovers from all over Kentucky (and beyond) stopped by the Isle — here's what they found.</p>
      </div>
    </section>
  );
}