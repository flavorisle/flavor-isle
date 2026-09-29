import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

export default function PhotoChapter({ photo, heading, text, action, to = '/order', full = false }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <section ref={ref} className={`relative isolate overflow-clip bg-patina-mint text-white ${full ? 'min-h-[85svh]' : 'min-h-[68svh]'}`}>
      <div className="sticky top-0 h-[85svh] overflow-hidden">
        <img src={photo.url} alt={photo.alt} width="1600" height="1000" loading="lazy" decoding="async"
          className="w-full h-full object-cover motion-safe:transition-transform motion-safe:duration-1000"
          style={{ transform: visible ? 'scale(1)' : 'scale(1.045)' }} />
        <div className="absolute inset-0 bg-patina-mint/60" aria-hidden="true" />
        <div className={`absolute inset-x-0 bottom-0 p-6 sm:p-12 max-w-4xl mx-auto motion-safe:transition-[opacity,transform] motion-safe:duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}>
          <p className="font-heading text-sm tracking-widest uppercase text-smashie-yellow">{photo.caption}</p>
          {heading && <h2 className="font-heading text-4xl sm:text-6xl leading-none mt-2">{heading}</h2>}
          {text && <p className="mt-3 max-w-xl text-base sm:text-lg">{text}</p>}
          {action && (to.startsWith('http')
            ? <a href={to} target="_blank" rel="noopener noreferrer" className="btn-cherry chrome-hover mt-5 inline-flex min-h-12 items-center px-7 py-3 text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{action}</a>
            : <Link to={to} className="btn-cherry chrome-hover mt-5 inline-flex min-h-12 items-center px-7 py-3 text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{action}</Link>)}
        </div>
      </div>
    </section>
  );
}