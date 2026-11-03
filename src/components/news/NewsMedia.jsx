import React from 'react';

// One photo or video attached to a news post. `media` is a { url, kind, caption }
// record from NewsPost.media.
export default function NewsMedia({ media, className = '' }) {
  if (!media?.url) return null;
  return (
    <figure className={className}>
      {media.kind === 'video' ? (
        <video
          src={media.url}
          controls
          playsInline
          preload="metadata"
          className="w-full h-auto rounded-xl block bg-black"
        />
      ) : (
        <img
          src={media.url}
          alt={media.caption || ''}
          className="w-full h-auto rounded-xl block"
          loading="lazy"
        />
      )}
      {media.caption && (
        <figcaption className="font-body text-xs text-muted-foreground mt-2">
          {media.caption}
        </figcaption>
      )}
    </figure>
  );
}