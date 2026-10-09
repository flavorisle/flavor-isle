// Horizontal carousel for the Reviews "Wall of Love". Shows 4 cards on
// desktop, 2 on tablet, ~1 on mobile, with arrow controls that advance one
// viewport at a time. Scroll-snap keeps cards aligned as you drag or click.
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ReviewsCarousel({ reviews }) {
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update, reviews]);

  const advance = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  if (!reviews || reviews.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-1 px-1"
      >
        {reviews.map((r, i) => (
          <div
            key={i}
            className="snap-start flex-shrink-0 w-[85%] sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)]"
          >
            <ReviewCard {...r} />
          </div>
        ))}
      </div>

      {canPrev && (
        <button
          onClick={() => advance(-1)}
          aria-label="Previous reviews"
          className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-float border border-border items-center justify-center text-obsidian-roast hover:bg-midnight-cherry hover:text-white transition-colors z-10"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {canNext && (
        <button
          onClick={() => advance(1)}
          aria-label="Next reviews"
          className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-float border border-border items-center justify-center text-obsidian-roast hover:bg-midnight-cherry hover:text-white transition-colors z-10"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </div>
  );
}

// Curated external reviews (Yelp, Tripadvisor, Google, Facebook) carry no
// rating field of their own, so each source gets its own branded mark: Google,
// Facebook and Yelp show a 5-star row, Tripadvisor its 5 green bubbles. Reviews submitted
// through our own form still render their actual star rating.
function ReviewCard({ text, name, source, rating }) {
  const src = (source || '').toLowerCase();
  // Google, Facebook and Yelp reviews all read as a 5-out-of-5 star row;
  // Tripadvisor keeps its own green bubble scale.
  const isStars = src.includes('google') || src.includes('facebook') || src.includes('yelp');
  const isTripadvisor = src.includes('tripadvisor');

  return (
    <div className="card-diner p-5 h-full">
      <div className="flex items-center gap-2 mb-3">
        {isStars ? (
          <div className="flex" role="img" aria-label="Rated 5 out of 5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={14} className="text-amber-500 fill-amber-500" />
            ))}
          </div>
        ) : isTripadvisor ? (
          <div className="flex gap-0.5" role="img" aria-label="Rated 5 out of 5 on Tripadvisor">
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className="w-3.5 h-3.5 rounded-full border-2 border-green-600 flex items-center justify-center"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
              </span>
            ))}
          </div>
        ) : rating > 0 ? (
          <div className="flex">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                className={i < rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}
              />
            ))}
          </div>
        ) : null}
        {source && (
          <span className="text-xs font-heading uppercase tracking-wider text-patina-mint">{source}</span>
        )}
      </div>
      <p className="text-sm text-obsidian-roast leading-relaxed mb-3">&ldquo;{text}&rdquo;</p>
      <p className="text-xs text-muted-foreground font-semibold">— {name}</p>
    </div>
  );
}