import { base44 } from '@/api/base44Client';

// Shared cache for the getBusyness backend so the site-wide live status bar
// and the "How busy are we?" card don't fire two simultaneous calls on page
// load. A short TTL keeps data fresh for the 60s poller while letting the
// 5-min poller reuse the cached response instead of re-fetching.
let _cached = null;
let _fetchPromise = null;
let _cachedAt = 0;
const TTL = 20000; // 20s

export async function fetchBusyness({ force = false } = {}) {
  const now = Date.now();
  if (!force && _cached && now - _cachedAt < TTL) return _cached;
  if (_fetchPromise) return _fetchPromise;
  _fetchPromise = (async () => {
    try {
      const res = await base44.functions.invoke('getBusyness', {});
      const data = res?.data || res;
      _cached = data;
      _cachedAt = Date.now();
      return data;
    } finally {
      _fetchPromise = null;
    }
  })();
  return _fetchPromise;
}

export function getCachedBusyness() {
  return _cached;
}