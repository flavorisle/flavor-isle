// base44/shared/emailSafety.ts
//
// flavorisle.com is NOT ours. It is a third-party parked domain (A 13.56.33.8,
// no MX, SPF -all, listed for sale via Afternic). Only flavor-isle.com belongs
// to Flavor Isle. Nothing may ever be emailed to the other one, and no code may
// mint a new address on it.
//
// Every sender and every "is this a real customer email" check must use
// isEmailableCustomer() / isPlaceholderEmail() from this file, never a local
// string list, so the rule cannot drift file to file again.

export const OWN_DOMAIN = 'flavor-isle.com';

// Domains that look like ours but are not.
const FOREIGN_DOMAINS = ['flavorisle.com'];

// Placeholder addresses stamped on orders that carry no real customer email.
// Both spellings stay on the list forever: records written before the Nov 14
// 2026 fix still hold the old spelling, and must never become live addresses.
const PLACEHOLDERS = new Set([
  'square-pos@flavorisle.com',
  'square-pos@flavor-isle.com',
  'phone-order@flavorisle.com',
  'phone-order@flavor-isle.com',
  'test@flavorisle.com',
  'test@example.com',
]);

export const SQUARE_PLACEHOLDER = 'square-pos@flavor-isle.com';
export const PHONE_PLACEHOLDER = 'phone-order@flavor-isle.com';

export function normalizeEmail(email?: string): string {
  return String(email || '').toLowerCase().trim();
}

export function isForeignDomainEmail(email?: string): boolean {
  const e = normalizeEmail(email);
  if (!e.includes('@')) return false;
  const domain = e.split('@').pop() as string;
  return FOREIGN_DOMAINS.some((d) => domain === d || domain.endsWith('.' + d));
}

export function isPlaceholderEmail(email?: string): boolean {
  const e = normalizeEmail(email);
  if (!e) return true;
  return PLACEHOLDERS.has(e) || isForeignDomainEmail(e);
}

// The one check every sender runs before handing an address to Resend.
export function isEmailableCustomer(email?: string): boolean {
  const e = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
  return !isPlaceholderEmail(e);
}