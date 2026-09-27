import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { analyzeOrderHealth } from '@/lib/orderDiagnostics';

// Shared order-health data for the failed-order alert and the diagnostics
// panel. Both mount together on the admin dashboard, so the in-flight request
// is cached and shared instead of hitting the API twice. Short TTL, because an
// operator watching this screen wants fresh numbers on the next visit.
const ORDER_LIMIT = 200;
const LOG_LIMIT = 100;
const CACHE_MS = 60 * 1000;

let cache = null; // { at, promise }

export function fetchOrderHealth(force = false) {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.promise;

  const promise = Promise.all([
    base44.entities.Order.list('-created_date', ORDER_LIMIT),
    base44.entities.SquareSyncLog.list('-created_date', LOG_LIMIT),
  ])
    .then(([orders, logs]) =>
      analyzeOrderHealth({ orders: orders || [], logs: logs || [], now: Date.now() }),
    )
    .catch((err) => {
      cache = null; // never cache a failure
      throw err;
    });

  cache = { at: Date.now(), promise };
  return promise;
}

export default function useOrderDiagnostics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (force) => {
    setLoading(true);
    try {
      setData(await fetchOrderHealth(force));
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  return { data, error, loading, reload: () => load(true) };
}