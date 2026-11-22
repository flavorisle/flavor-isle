import { base44 } from '@/api/base44Client';

// One id per checkout visit, kept for the tab so a reload continues the same
// attempt instead of leaving a stale one behind for the watchdog to report.
const KEY = 'fi_checkout_session';
const TTL = 45 * 60 * 1000;

export function checkoutSessionId() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved?.id && Date.now() - Number(saved.at || 0) < TTL) return saved.id;
    }
  } catch {
    // Private mode with no storage: fall through to a fresh id.
  }
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID().replace(/-/g, '')
    : `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ id, at: Date.now() }));
  } catch {
    // Storage refused; the id still works for this page view.
  }
  return id;
}

// Fire-and-forget: checkout must never wait on, or fail because of, its own
// watchdog record.
export function logCheckoutAttempt(payload) {
  return base44.functions.invoke('logCheckoutAttempt', payload).catch(() => null);
}