import { base44 } from '@/api/base44Client';

// Product page URLs use the item's name instead of an opaque id:
//   /product/backyard-bbq-burger  (instead of /product/6ab2d3f6dfddfc7740e92cde)
// The slug is derived from the name at read time, so renames, catalog syncs,
// and new items all work without storing or migrating anything. Older id-based
// links (cart edit links, links shared before this change) still resolve —
// findMenuItem accepts either the slug or the raw id.
export function slugifyName(name) {
  return String(name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function productSlug(item) {
  return slugifyName(item?.name);
}

export function productPath(item) {
  const slug = productSlug(item);
  return `/product/${slug || item?.id || ''}`;
}

export function isMenuItemId(value) {
  return /^[0-9a-f]{24}$/i.test(String(value || ''));
}

// Resolve a /product/:slug route param to the menu item it points at.
export async function findMenuItem(param) {
  const value = decodeURIComponent(String(param || '')).trim();
  if (!value) return null;

  if (isMenuItemId(value)) {
    try {
      const byId = await base44.entities.MenuItem.get(value);
      if (byId) return byId;
    } catch {
      // Not a real id — fall through to the name lookup below.
    }
  }

  const wanted = value.toLowerCase();
  const items = await base44.entities.MenuItem.list();
  const matches = (items || []).filter((item) => productSlug(item) === wanted);
  // Retired Square catalog records often keep the same name as the live item, so
  // always resolve the name to the record customers can actually order.
  return matches.find((item) => !item.is_hidden) || matches[0] || null;
}