# Builder report: reviews_carousel_4deep_2026-09-23

## Reviews page Wall of Love converted to a 4-across carousel

**Status:** applied  
**App entity:** BuilderReport `6ab445ecac8f0cc5e1f45bc2`

### Before

Reviews.jsx Wall of Love was a static 2-column grid (grid-cols-1 sm:grid-cols-2) listing all reviews at once, with an inline ReviewCard function. No carousel.

### After

Created src/components/ReviewsCarousel.jsx: horizontal scroll-snap carousel, 4 cards on desktop / 2 on tablet / ~1 on mobile, arrow controls that advance one viewport. Wired into Reviews.jsx Wall of Love (max-w-6xl) replacing the 2-col grid; removed the old inline ReviewCard (now lives in the carousel component). No data sources, filters, or other sections changed.
