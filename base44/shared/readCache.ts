// Short-lived cache for a shared server-side read.
//
// Some reads return the same records on every call (the block list, the menu,
// admin recipients). Holding the last result for about a minute means one read
// instead of one per caller, which is what the code-health scan asks for.
//
// This caches the shared read itself, never a per-caller response: the caller
// keeps every access check before it calls in, and a failed load is never
// cached, so a hiccup is retried on the next call.
export function createReadCache(ttlMs = 60 * 1000) {
  let cached = null;
  return async function readCached(loader) {
    if (cached && Date.now() - cached.at < ttlMs) return cached.data;
    const data = await loader();
    cached = { data, at: Date.now() };
    return data;
  };
}