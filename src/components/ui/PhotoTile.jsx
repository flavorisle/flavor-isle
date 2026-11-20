import React from 'react';
import { cn, optimizedImageUrl } from '@/lib/utils';

// Photo-first tile (issue #339). A fixed square crop so a row of tiles never
// jumps as photos load: the box is sized by `aspect-square` and the photo fills
// it with object-cover. The photo is requested from the media library at twice
// the box it renders in, so it stays sharp on a phone without shipping the
// original.
const SIZES = {
  sm: { box: 'w-16 h-16', request: 128 },   // 64px box
  md: { box: 'w-24 h-24', request: 192 },   // 96px box
  lg: { box: 'w-full', request: 800 },      // full-width hero
};

export default function PhotoTile({ imageUrl, alt, size = 'md', badge, price, className, imgStyle }) {
  const dims = SIZES[size] || SIZES.md;
  return (
    <div className={cn('relative aspect-square overflow-hidden rounded-xl bg-muted', dims.box, className)}>
      {imageUrl ? (
        <img
          src={optimizedImageUrl(imageUrl, dims.request, dims.request)}
          alt={alt || ''}
          width={dims.request}
          height={dims.request}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          style={imgStyle}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-vanilla-malt text-2xl" aria-hidden="true">🍽️</div>
      )}
      {badge && (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-midnight-cherry px-2 py-0.5 font-heading text-[10px] uppercase tracking-wider text-white">
          {badge}
        </span>
      )}
      {price != null && (
        <span className="absolute bottom-1.5 right-1.5 rounded-full bg-white/95 px-2 py-0.5 font-heading text-xs tabular-nums text-obsidian-roast">
          ${Number(price).toFixed(2)}
        </span>
      )}
    </div>
  );
}