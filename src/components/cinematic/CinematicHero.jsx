import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { islePhotos } from '@/components/cinematic/photos';
import { optimizedImageUrl } from '@/lib/utils';

export default function CinematicHero({ heading = 'Two minutes off I-65. Zero regrets.', subtitle = 'Burgers & shakes in Smiths Grove since 1964.', photo = islePhotos.sign, cityLine = false }) {
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
      {photo && <img ref={image} src={optimizedImageUrl(photo.url, 1600, 900)} alt={photo.alt} width="1600" height="900" fetchPriority="high" decoding="async"
        className="absolute inset-0 w-full h-full object-cover motion-safe:scale-[1.08]" />}
      <div className="absolute inset-0 bg-patina-mint/60" aria-hidden="true" />
      <div className="relative max-w-6xl mx-auto w-full px-5 sm:px-10 pb-16 pt-32">
        <p className="font-heading text-sm tracking-widest text-smashie-yellow uppercase">I-65 Exit 38 · Smiths Grove, Kentucky</p>
        <h1 className="font-heading text-5xl sm:text-7xl leading-none max-w-3xl mt-3">{heading}</h1>
        {cityLine && <p className="font-heading text-sm drop-shadow-lg tracking-widest">SMITHS GROVE, KENTUCKY</p>}
        <p className="text-lg mt-4 max-w-xl">{subtitle}</p>
        <Link to="/order" className="btn-cherry chrome-hover inline-flex items-center min-h-12 px-8 py-3 mt-6 text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Order Now</Link>
      </div>
    </section>
  );
}