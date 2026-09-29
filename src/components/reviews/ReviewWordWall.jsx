import React from 'react';
import { optimizedImageUrl } from '@/lib/utils';

const photos = [
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/99f75bee4_CD56F694-082A-4650-9E1C-5F5F95B2F288.jpg', alt: 'Guests at the outdoor tables at Flavor Isle', caption: 'Around the table' },
  { url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/b2e82dac6_IMG_1268.jpeg', alt: 'Burger patties and buns cooking on the Flavor Isle flat-top grill', caption: 'Fresh off the flat-top' },
];

const words = [
  { quote: 'the BEST food and milkshakes in the area', name: 'Facebook reviewer', source: 'Facebook' },
  { quote: 'Truly a hidden gem.', name: 'Juwan C.', source: 'Yelp' },
  { quote: 'Worth the drive if you are around!', name: 'John W.', source: 'Yelp' },
  { quote: 'I will be stopping here on every road trip.', name: 'Emily A.', source: 'Yelp' },
];

export default function ReviewWordWall() {
  return (
    <section className="bg-patina-mint text-white px-4 sm:px-6 py-20" aria-labelledby="word-wall-heading">
      <div className="max-w-6xl mx-auto">
        <p className="font-heading uppercase tracking-widest text-sm text-smashie-yellow">In their own words</p>
        <h2 id="word-wall-heading" className="font-heading text-4xl sm:text-6xl leading-none mt-2 mb-8">The Word Wall</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <figure className="relative min-h-64 overflow-hidden rounded-xl sm:row-span-2">
            <img src={optimizedImageUrl(photos[0].url, 800, 1000)} alt={photos[0].alt} width="800" height="1000" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pt-12 pb-5 font-heading text-xl">{photos[0].caption}</figcaption>
          </figure>
          {words.slice(0, 2).map(({ quote, name, source }, i) => (
            <figure key={name} className={`min-h-64 rounded-xl p-7 flex flex-col justify-between ${i ? 'bg-vanilla-malt text-obsidian-roast' : 'bg-midnight-cherry text-white'}`}>
              <span className="font-heading text-6xl leading-none opacity-60" aria-hidden="true">“</span>
              <blockquote className="font-heading text-3xl sm:text-4xl leading-tight break-words">{quote}</blockquote>
              <figcaption className="font-body text-sm mt-5">— {name} · {source}</figcaption>
            </figure>
          ))}
          {words.slice(2).map(({ quote, name, source }, i) => (
            <figure key={name} className={`min-h-64 rounded-xl p-7 flex flex-col justify-between ${i ? 'bg-midnight-cherry text-white' : 'bg-vanilla-malt text-obsidian-roast'}`}>
              <span className="font-heading text-6xl leading-none opacity-60" aria-hidden="true">“</span>
              <blockquote className="font-heading text-3xl sm:text-4xl leading-tight break-words">{quote}</blockquote>
              <figcaption className="font-body text-sm mt-5">— {name} · {source}</figcaption>
            </figure>
          ))}
          <figure className="relative min-h-64 overflow-hidden rounded-xl">
            <img src={optimizedImageUrl(photos[1].url, 800, 600)} alt={photos[1].alt} width="800" height="600" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pt-12 pb-5 font-heading text-xl">{photos[1].caption}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}