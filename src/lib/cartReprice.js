import { base44 } from '@/api/base44Client';

// The authoritative price of every cart line, asked of the server that charges it
// (issue #360). The server re-prices each line from MenuItem and the Square
// modifier catalog, the same rules the pay button verifies with, and answers with
// one unit price per line, in cart order. It creates nothing and charges nothing.
// A cart that cannot be priced answers { ok: false, error }, and the caller shows
// that sentence without changing the cart.
export async function fetchAuthoritativePrices(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  try {
    const res = await base44.functions.invoke('repriceCart', { items });
    const data = res?.data || res;
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    // A failed check must never block the cart or the page.
    return null;
  }
}