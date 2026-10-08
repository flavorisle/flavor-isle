import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { GALLERY_PHOTOS } from '@/lib/galleryPhotos';
import { issue23Photos } from '@/lib/issue23Photos';
import { optimizedImageUrl } from '@/lib/utils';

// Compact three-photo strip on the homepage — real food shots pulled from the
// app's photo library (the same set the /gallery page shows), linking through
// to the full gallery. The two picks below are not used by any other homepage
// placement, so no photo appears twice across the page.
const MEDIA = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/';
const STRIP_URLS = [
  `${MEDIA}ff12a1c2b_IMG_0375.png`,
  `${MEDIA}34f1bfc0b_IMG_5541_Original.jpg`,
];

export default function GalleryPhotoStrip() {
  const photos = [
    ...STRIP_URLS.map((url) => {
      const match = GALLERY_PHOTOS.find((photo) => photo.url === url);
      return { url, alt: match?.alt || 'Flavor Isle food', caption: match?.caption || 'From our kitchen' };
    }),
    { url: issue23Photos.flattop, alt: 'Fresh Off the Flattop at Flavor Isle', caption: 'Fresh off the flattop' },
  ];

  return (
    <section className="py-10 px-4 sm:px-6 bg-vanilla-malt">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-heading text-2xl sm:text-3xl text-obsidian-roast">Fresh Off the Flattop</h2>
          <Link
            to="/gallery"
            className="text-sm font-heading text-midnight-cherry inline-flex items-center gap-1.5 hover:gap-2.5 transition-all flex-shrink-0"
          >
            See the gallery <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {photos.map((photo) => (
            <Link key={photo.url} to="/gallery" className="card-diner overflow-hidden block group">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={optimizedImageUrl(photo.url, 500, 375)}
                  alt={photo.alt}
                  width="500"
                  height="375"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                />
              </div>
              <p className="px-3 py-2 text-xs sm:text-sm text-muted-foreground">{photo.caption}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}