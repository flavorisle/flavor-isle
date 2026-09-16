// Horizontal, swipeable carousel of customer reviews with desktop arrow controls.
import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Star } from 'lucide-react';
import ReviewCard from '@/components/ReviewCard';

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

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={updateEdges}
        className="flex gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 -mx-1 px-1"
      >
        {reviews.map((r, i) => (
          <div
            key={r.id || i}
            className="snap-start flex-shrink-0 w-[85%] sm:w-[48%] lg:w-[31.5%]"
          >
            <ReviewCard review={r} />
          </div>
        ))}

        {/* CTA card — links to the full reviews page */}
        <div className="snap-start flex-shrink-0 w-[85%] sm:w-[48%] lg:w-[31.5%]">
          <Link
            to="/reviews"
            className="block h-full rounded-2xl bg-obsidian-roast text-white p-6 flex flex-col items-center justify-center text-center min-h-[220px] hover:shadow-float-lg transition-all group"
          >
            <div className="flex gap-1 mb-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star key={i} size={18} className="text-amber-400 fill-amber-400" />
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