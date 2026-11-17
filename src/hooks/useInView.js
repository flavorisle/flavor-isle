// Tells a component when it first approaches the viewport.
//
// Used by the two merch promo cards: they sit below the fold on most pages,
// so without this they fire a Printful request on page load for artwork the
// visitor may never scroll to. The 300px rootMargin means it starts loading
// just before it scrolls into view, so the visitor never sees a placeholder.

import { useEffect, useRef, useState } from 'react';

export default function useInView({ rootMargin = '300px', once = true } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          if (once) observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, once, rootMargin]);

  return [ref, inView];
}