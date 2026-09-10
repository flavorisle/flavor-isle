// Horizontal, swipeable carousel of customer reviews with desktop arrow controls.
import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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