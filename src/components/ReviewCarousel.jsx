// Horizontal, swipeable carousel of customer reviews with desktop arrow controls.
import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Star, ExternalLink } from 'lucide-react';
import ReviewCard from '@/components/ReviewCard';

const GOOGLE_SEARCH_URL = 'https://www.google.com/search?q=Flavor+Isle+Smiths+Grove+KY+reviews';

export default function ReviewCarousel({ reviews }) {
  const trackRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = () => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 8);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  };

  useEffect(() => {
    updateEdges();
  }, [reviews]);

  const scrollByCard = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(el.clientWidth * 0.9, 400), behavior: 'smooth' });
  };

  if (!reviews?.length) return null;

  // Build the carousel items: insert the "See What People Are Saying" CTA
  // at position 3 (index 2) and the "Reviews on Google" CTA at position 7
  // (index 6). If there aren't enough reviews the CTAs append at the end.
  const items = [];
  reviews.forEach((r, i) => {
    if (i === 2) items.push({ type: 'cta-reviews' });
    if (i === 5) items.push({ type: 'cta-google' });
    items.push(r);
  });
  if (reviews.length <= 2) items.push({ type: 'cta-reviews' });
  if (reviews.length <= 5) items.push({ type: 'cta-google' });

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={updateEdges}
        className="flex gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-1 px-1"
      >
        {items.map((item, i) => {
          // CTA — links to the full reviews page
          if (item.type === 'cta-reviews') {
            return (
              <div key={`cta-reviews-${i}`} className="snap-start flex-shrink-0 w-[85%] sm:w-[48%] lg:w-[31.5%]">
                <Link
                  to="/reviews"
                  className="block h-full rounded-2xl bg-obsidian-roast text-white p-6 flex flex-col items-center justify-center text-center min-h-[220px] hover:shadow-float-lg transition-all group"
                >
                  <div className="flex gap-1 mb-4">
                    {[0, 1, 2, 3, 4].map((s) => (
                      <Star key={s} size={18} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="font-heading text-xl mb-2">See What People Are Saying</p>
                  <p className="text-sm text-gray-300 mb-5 max-w-xs">
                    Watch TikTok & Instagram food reviews and read more from our neighbors.
                  </p>
                  <span className="inline-flex items-center gap-2 bg-midnight-cherry px-5 py-2.5 rounded-full text-sm font-heading group-hover:gap-3 transition-all">
                    View All Reviews <ArrowRight size={16} />
                  </span>
                </Link>
              </div>
            );
          }

          // CTA — links to Google reviews
          if (item.type === 'cta-google') {
            return (
              <div key={`cta-google-${i}`} className="snap-start flex-shrink-0 w-[85%] sm:w-[48%] lg:w-[31.5%]">
                <a
                  href={GOOGLE_SEARCH_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full rounded-2xl bg-white border-2 border-patina-mint/20 p-6 flex flex-col items-center justify-center text-center min-h-[220px] hover:shadow-float-lg transition-all group"
                >
                  <div className="flex gap-1 mb-4">
                    {[0, 1, 2, 3, 4].map((s) => (
                      <Star key={s} size={18} className="text-amber-500 fill-amber-500" />
                    ))}
                  </div>
                  <p className="font-heading text-xl text-obsidian-roast mb-2">Reviews on Google</p>
                  <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                    See what folks around Smiths Grove are saying on Google — or add your own.
                  </p>
                  <span className="inline-flex items-center gap-2 bg-patina-mint text-white px-5 py-2.5 rounded-full text-sm font-heading group-hover:gap-3 transition-all">
                    Read Google Reviews <ExternalLink size={15} />
                  </span>
                </a>
              </div>
            );
          }

          return (
            <div
              key={item.id || i}
              className="snap-start flex-shrink-0 w-[85%] sm:w-[48%] lg:w-[31.5%]"
            >
              <ReviewCard review={item} />
            </div>
          );
        })}
      </div>

      {/* Desktop arrows */}
      {!atStart && (
        <button
          onClick={() => scrollByCard(-1)}
          aria-label="Previous reviews"
          className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-float items-center justify-center text-obsidian-roast hover:text-midnight-cherry transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {!atEnd && (
        <button
          onClick={() => scrollByCard(1)}
          aria-label="More reviews"
          className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white shadow-float items-center justify-center text-obsidian-roast hover:text-midnight-cherry transition-colors"
        >
          <ChevronRight size={22} />
        </button>
      )}

      <p className="md:hidden text-center text-xs text-muted-foreground mt-3">← Swipe for more reviews →</p>
    </div>
  );
}