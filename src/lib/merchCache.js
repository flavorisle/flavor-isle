// Shared, single-flight cache for the Tasty Threads product list.
//
// MerchPromo and MerchPromoCard each invoked getPrintfulProducts on their
// own, which fired two identical backend calls on every page load — on
// pages that do not sell merch at all. Now they share one call.

import { base44 } from '@/api/base44Client';

const TTL_MS = 5 * 60 * 1000;

let cached = null;   // { data, at }
let inflight = null;

export function getMerchProducts() {
  const now = Date.now();

  if (cached && now - cached.at < TTL_MS) return Promise.resolve(cached.data);
  if (inflight) return inflight;

  inflight = base44.functions.invoke('getPrintfulProducts', {})
    .then((res) => {
      const data = res?.data || {};
      cached = { data, at: Date.now() };
      inflight = null;
      return data;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });

  return inflight;
}

export function invalidateMerchCache() {
  cached = null;
  inflight = null;
}