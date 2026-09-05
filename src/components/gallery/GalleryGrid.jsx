import React from 'react';

// Masonry-style grid of gallery photos; tapping a tile opens the lightbox.
export default function GalleryGrid({ photos, onSelect }) {
  return (
    <div className="columns-2 md:columns-3 gap-3 sm:gap-4 [column-fill:_balance]">
      {photos.map((photo, i) => (
        <button
          key={photo.url}
          onClick={() => onSelect(i)}
          className="mb-3 sm:mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl shadow-float group relative"
        >
          <img
            src={photo.url}
            alt={photo.alt}
            loading="lazy"
            className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 p-2.5 pt-8 bg-gradient-to-t from-black/70 to-transparent text-left">
            <p className="font-heading text-xs sm:text-sm text-white leading-tight tracking-wide">
              {photo.caption}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}