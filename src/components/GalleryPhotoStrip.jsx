import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { issue23Photos } from '@/lib/issue23Photos';


// Compact two-photo strip on the homepage — real food shots pulled from the
// gallery data, linking through to the full /gallery page.
export default function GalleryPhotoStrip({ items = [] }) {
  const photos = [...items.filter((item) => item.image_url).slice(0, 2).map((item) => ({
    url: item.image_url, alt: item.name, caption: item.name,
  })), { url: issue23Photos.flattop, alt: 'Fresh Off the Flattop at Flavor Isle', caption: 'Fresh off the flattop' }];

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
                  src={photo.url}
                  alt={photo.alt}
                  loading="lazy"
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