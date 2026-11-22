import React from 'react';
import { Link } from 'react-router-dom';

// Issue #345, item 1 — the home hero is one photo filling the whole section,
// edge to edge, with the copy sitting bottom-left over a single readability
// fade. No panel, no split, no tint of its own.
export default function FullBleedHero({
  imageUrl,
  heading,
  subheading,
  ctaLabel,
  ctaTo,
  tagline,
  metaLine = '',
}) {
  return (
    <section
      className="relative isolate w-full min-h-[78svh] sm:min-h-[70svh] flex items-end overflow-hidden text-white"
      style={{
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 32%',
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(8,14,26,0.90) 0%, rgba(8,14,26,0) 72%)' }}
        aria-hidden="true"
      />

      <div className="relative w-full px-5 sm:px-10 pb-10 sm:pb-14">
        <div className="max-w-[640px]">
          <h1 className="font-heading text-4xl sm:text-6xl leading-none">{heading}</h1>
          <h2 className="font-heading text-xl sm:text-3xl mt-3 text-white/95">{subheading}</h2>
          <Link
            to={ctaTo}
            className="btn-cherry chrome-hover inline-flex items-center justify-center min-h-12 px-7 py-3 text-lg mt-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {ctaLabel}
          </Link>
          {tagline && <p className="text-sm text-white/85 mt-3">{tagline}</p>}
          {metaLine && <p className="text-sm text-white/80 mt-2">{metaLine}</p>}
        </div>
      </div>
    </section>
  );
}