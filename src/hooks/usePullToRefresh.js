import { useEffect, useRef, useState } from 'react';

// Simple custom pull-to-refresh driven by touch events. Only activates when
// the viewport is scrolled to the very top. Returns { pull, refreshing } so
// callers can render a spinner indicator. onRefresh may be async.
export default function usePullToRefresh(onRefresh, { threshold = 70, max = 110 } = {}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef(null);
  const pulling = useRef(false);
  const pullDist = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  useEffect(() => { onRefreshRef.current = onRefresh; });

  useEffect(() => {
    const onTouchStart = (e) => {
      if (window.scrollY > 0 || refreshingRef.current) {
        startY.current = null;
        pulling.current = false;
        return;
      }
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e) => {
      if (!pulling.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        pullDist.current = 0;
        setPull(0);
        return;
      }
      // Apply light resistance so it feels like a rubber-band pull.
      const resisted = Math.min(max, dy * 0.5);
      pullDist.current = resisted;
      setPull(resisted);
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      const dist = pullDist.current;
      startY.current = null;
      pullDist.current = 0;

      if (dist >= threshold) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefreshRef.current?.();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [threshold, max]);

  return { pull, refreshing };
}