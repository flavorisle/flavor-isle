import { base44 } from '@/api/base44Client';

// Side options offered in the Isle Combo. Order matters — it controls the
// button order shown in the modifier modal.
const SIDE_NAMES = [
  'French Fries',
  'Tater Tots',
  'Curly Fries',
  'Cajun Waffle Fries',
  'Onion Rings',
  'Sweet Potato Fries',
];

// Session-level cache for the combo building blocks (sides + shake + drink).
// Fetching the menu on every burger-modal open burst the API rate limit, which
// made the "Make it an Isle Combo" option disappear after the first combo was
// added. Caching once per session keeps the option available every time.
let cache = null;
let pending = null;

export function getComboData() {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;
  pending = (async () => {
    try {
      const items = await base44.entities.MenuItem.list('-name', 200);
      const sides = SIDE_NAMES
        .map((n) => items.find((i) => i.name === n && i.is_available && !i.is_hidden))
        .filter(Boolean);
      const shake = items.find(
        (i) => i.name === 'Vanilla Milkshake' && i.is_available && !i.is_hidden,
      );
      const drink = items.find(
        (i) => i.name === 'Classic Drinks' && i.is_available && !i.is_hidden,
      );
      if (sides.length && shake && drink) {
        cache = { sides, shake, drink };
        return cache;
      }
      return null;
    } catch {
      // Transient failure (e.g. rate limit) — don't cache so a later open can retry.
      return null;
    } finally {
      pending = null;
    }
  })();
  return pending;
}