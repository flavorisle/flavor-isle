// Shared, single-flight cache for menu reads.
//
// Every component that needs the menu goes through here, so the full
// MenuItem table is fetched once per page load instead of seven times.
// The API is plain Promises on purpose: the existing call sites already
// use Promise.all(...).then(...), so swapping the call keeps them intact.

import { base44 } from '@/api/base44Client';

const TTL_MS = 5 * 60 * 1000;
const entries = new Map();

function read(key, fetcher) {
  const now = Date.now();
  const hit = entries.get(key);

  if (hit) {
    // Already in flight — join it instead of firing a second request.
    if (hit.promise) return hit.promise;
    // Resolved and still fresh.
    if (now - hit.at < TTL_MS) return Promise.resolve(hit.data);
  }

  const promise = fetcher()
    .then((data) => {
      entries.set(key, { data, at: Date.now() });
      return data;
    })
    .catch((err) => {
      // Never cache a failure.
      entries.delete(key);
      throw err;
    });

  entries.set(key, { promise, at: now });
  return promise;
}

export function getMenuItems() {
  return read('menu:all', () => base44.entities.MenuItem.list());
}

export function getShakeItems() {
  return read('menu:shakes', () =>
    base44.entities.MenuItem.filter({ square_category: 'Whirl & Twirl', is_hidden: false }));
}

export function getFanFavorites() {
  return read('menu:fan-favorites', () =>
    base44.entities.MenuItem.filter({ is_fan_favorite: true }, 'fan_favorite_rank', 10));
}

export function getRecentlyUpdatedItems() {
  return read('menu:recent', () => base44.entities.MenuItem.list('-updated_date', 500));
}

export function getMenuItemsByName() {
  return read('menu:by-name', () => base44.entities.MenuItem.list('-name', 200));
}

export function getAvailableItems() {
  return read('menu:available', () =>
    base44.entities.MenuItem.filter({ is_available: true, is_hidden: false }, '-name', 500));
}

export function invalidateMenuCache() {
  entries.clear();
}