// Admin screens used to re-read the same records every time someone landed on a
// screen or switched a tab, which spends the per-person read budget fast enough
// to hit the platform's rate limit. Each read is now remembered for a short
// window and shared with any screen that asks for the same list, and a Refresh
// button passes force to read again right now.

const TTL_MS = 2 * 60 * 1000;
const entries = new Map();

// The list read within the window, or the read already in flight, is reused.
export function cachedRead(key, fetcher, { ttl = TTL_MS, force = false } = {}) {
  const hit = entries.get(key);
  if (!force) {
    if (hit?.pending) return hit.pending;
    if (hit && Date.now() - hit.at < ttl) return Promise.resolve(hit.value);
  }

  const pending = Promise.resolve()
    .then(fetcher)
    .then((value) => {
      entries.set(key, { at: Date.now(), value });
      return value;
    })
    .catch((error) => {
      entries.delete(key);
      throw error;
    });

  entries.set(key, { at: 0, value: hit?.value, pending });
  return pending;
}

// What is already held for a key, when it is still fresh, without reading again.
export function peekRead(key, ttl = TTL_MS) {
  const hit = entries.get(key);
  if (hit && !hit.pending && Date.now() - hit.at < ttl) return hit.value;
  return undefined;
}