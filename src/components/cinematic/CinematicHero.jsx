import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { islePhotos } from '@/components/cinematic/photos';
import { optimizedImageUrl } from '@/lib/utils';

// `actions` replaces the single Order Now button with the page's own set of
// next steps (order, menu, directions), and `metaLine` carries the address and
// hours under them — so the home hero answers "where, when, what now" without
// a location section further down the page.
export default function CinematicHero({
  heading = 'Two minutes off I-65. Zero regrets.',
  subtitle = 'Burgers & shakes in Smiths Grove since 1964.',
  photo = islePhotos.sign,
  cityLine = false,
  actions = null,
  metaLine = '',
}) {
  const image = useRef(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const drift = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (image.current) image.current.style.transform = `translate3d(0, ${Math.min(36, window.scrollY * 0.09)}px, 0) scale(1.08)`;
      });
    };
    window.addEventListener('scroll', drift, { passive: true });
    return () => { window.removeEventListener('scroll', drift); cancelAnimationFrame(frame); };
  }, []);
  return (
    <section className="relative isolate min-h-[78svh] flex items-end overflow-hidden bg-patina-mint text-white">
      <img ref={image} src={optimizedImageUrl(photo.url, 1600, 900)} alt={photo.alt} width="1600" height="900" loading="eager" fetchPriority="high" decoding="async"
        className="absolute inset-0 w-full h-full object-cover motion-safe:scale-[1.08]" />
      <div className="absolute inset-0 bg-patina-mint/60" aria-hidden="true" />
      <div className="relative max-w-6xl mx-auto w-full px-5 sm:px-10 pb-16 pt-32">
        <p className="font-heading text-sm tracking-widest text-smashie-yellow uppercase">I-65 Exit 38 · Smiths Grove, Kentucky</p>
        <h1 className="font-heading text-5xl sm:text-7xl leading-none max-w-3xl mt-3">{heading}</h1>
        {cityLine && <p className="font-heading text-sm drop-shadow-lg tracking-widest">SMITHS GROVE, KENTUCKY</p>}
        <p className="text-lg mt-4 max-w-xl">{subtitle}</p>
        {actions && actions.length > 0 ? (
          <div className="flex flex-wrap gap-3 mt-6">
            {actions.map((action) => {
              const classes = action.variant === 'primary'
                ? 'btn-cherry chrome-hover min-h-12 px-7 py-3 text-lg'
                : 'min-h-12 inline-flex items-center px-6 py-3 rounded-full border-2 border-white font-heading text-base hover:bg-white hover:text-patina-mint transition-colors';
              return action.href ? (
                <a
                  key={action.label}
                  href={action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center ${classes}`}
                >
                  {action.label}
                </a>
              ) : (
                <Link
                  key={action.label}
                  to={action.to}
                  className={`inline-flex items-center justify-center ${classes}`}
                >
                  {action.label}
                </Link>
              );
            })}
          </div>
        ) : (
          <Link to="/order" className="btn-cherry chrome-hover inline-flex items-center min-h-12 px-8 py-3 mt-6 text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Order Now</Link>
        )}
        {metaLine && (
          <p className="text-sm mt-5 text-white/85 max-w-xl">{metaLine}</p>
        )}
      </div>
    </section>
  );
}