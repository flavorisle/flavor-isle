import React, { useEffect, useRef, useState } from 'react';
import { optimizedImageUrl } from '@/lib/utils';

// Masonry-style grid of gallery photos; tapping a tile opens the lightbox.
export default function GalleryGrid({ photos, onSelect }) {
  const grid = useRef(null);
  const [revealed, setRevealed] = useState({});
  useEffect(() => {
    const nodes = grid.current?.querySelectorAll('[data-photo]') || [];
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        setRevealed(previous => ({ ...previous, [entry.target.dataset.photo]: true }));
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.05 });
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [photos]);
  return (
    <div ref={grid} className="columns-2 md:columns-3 gap-3 sm:gap-4 [column-fill:_balance]">
      {photos.map((photo, i) => (
        <button
          key={photo.url}
          data-photo={photo.url}
          onClick={() => onSelect(i)}
          className={`mb-3 sm:mb-4 block w-full break-inside-avoid overflow-hidden rounded-2xl shadow-float group relative motion-safe:transition-[opacity,transform] motion-safe:duration-500 ${revealed[photo.url] ? 'opacity-100 translate-y-0' : 'motion-safe:opacity-0 motion-safe:translate-y-4'}`}
        >
          <img
            src={optimizedImageUrl(photo.url, 800, 600)}
            alt={photo.alt}
            width="800" height="600" loading="lazy" decoding="async"
            className="w-full aspect-[4/3] object-cover motion-safe:transition-transform motion-safe:duration-500 group-hover:scale-105"
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