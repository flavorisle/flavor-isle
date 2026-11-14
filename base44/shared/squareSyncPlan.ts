// Issue #277 Part A — the pure decision logic of the Square POS sync.
//
// Every rule the sync applies to one Square order lives here, with no network
// and no entity writes, so it can be tested on its own later. The sync function
// resolves the Square data, then asks this module what to do with it.
//
// The rules are the ones already in production, moved — not changed:
//   • A Square order pushed from our own website (createSquareOrder writes
//     metadata.order_source = 'flavor-isle-website') is never imported as an
//     in-store order. Otherwise the double-push race shows up as a ghost ticket.
//   • Relinking fills EMPTY fields only. A value already stored is never
//     overwritten.
//   • The placeholder-email rule is unchanged: a placeholder (or a domain that
//     cannot receive mail) counts as no email at all.
//   • No email, phone or name is ever invented. Square's own value wins, then
//     the matched customer profile's, and otherwise the field stays empty.
import { isPlaceholderEmail } from './emailSafety.ts';

export const WEBSITE_ORDER_SOURCE = 'flavor-isle-website';

export type SyncAction = 'skip_website' | 'create' | 'none' | 'relink';

export type SyncPlan =
  | { action: 'skip_website'; reason: string }
  | { action: 'create' }
  | { action: 'none' }
  | { action: 'relink'; patch: Record<string, any> };

// A Square order that our own website created into Square first.
export function isWebsiteSourced(squareOrder: any): boolean {
  return squareOrder?.metadata?.order_source === WEBSITE_ORDER_SOURCE;
}

// An already-synced Order is worth a second look when Square can now resolve
// who paid it: a placeholder email, or any of the identity fields still empty.
export function orderNeedsRelink(existing: any): boolean {
  if (!existing) return false;
  return (
    isPlaceholderEmail(existing.customer_email) ||
    !existing.customer_phone ||
    !existing.customer_id ||
    !existing.square_customer_id
  );
}

// The identity fields a brand-new Order row carries. Square's own values first,
// then the matched profile's — and nothing at all when neither has one.
export function newOrderIdentity({
  linkedEmail,
  profileEmail,
  squarePhone,
  profilePhone,
  profileId,
  squareName,
}: {
  linkedEmail?: string;
  profileEmail?: string;
  squarePhone?: string;
  profilePhone?: string;
  profileId?: string;
  squareName?: string;
}): Record<string, any> {
  return {
    customer_name: String(squareName || '').trim() || 'Walk-In',
    customer_email: linkedEmail || profileEmail || '',
    customer_phone: squarePhone || profilePhone || '',
    customer_id: profileId || '',
  };
}

// The patch a relink writes: empty fields filled, real stored values kept, and
// an address that cannot receive mail cleared rather than left behind.
export function relinkPatch({
  existing,
  squareName,
  squareEmail,
  squarePhone,
  profileEmail,
  profilePhone,
  profileId,
  orderFields,
  loyalty,
}: {
  existing: any;
  squareName?: string;
  squareEmail?: string;
  squarePhone?: string;
  profileEmail?: string;
  profilePhone?: string;
  profileId?: string;
  orderFields?: Record<string, any>;
  loyalty?: Record<string, any>;
}): Record<string, any> {
  const patch: Record<string, any> = {};
  const srEmail = String(squareEmail || '').trim();

  if (srEmail) {
    if (!existing.customer_email || isPlaceholderEmail(existing.customer_email)) {
      patch.customer_email = srEmail;
    }
  } else if (isPlaceholderEmail(existing.customer_email)) {
    patch.customer_email = '';
  } else if (!existing.customer_email && profileEmail) {
    patch.customer_email = profileEmail;
  }

  // Both customer ids sit in their own fields, each only where the order has none.
  if (profileId && !existing.customer_id) patch.customer_id = profileId;
  if (orderFields?.square_customer_id && !existing.square_customer_id) {
    patch.square_customer_id = orderFields.square_customer_id;
  }

  const phoneToWrite = String(squarePhone || '').trim() || String(profilePhone || '');
  if (phoneToWrite && !existing.customer_phone) patch.customer_phone = phoneToWrite;
  if (orderFields?.normalized_phone && !existing.normalized_phone) {
    patch.normalized_phone = orderFields.normalized_phone;
  }

  const name = String(squareName || '').trim();
  if (name && name !== existing.customer_name) patch.customer_name = name;
  if (loyalty?.loyalty_accrued && !existing.loyalty_accrued) Object.assign(patch, loyalty);

  return patch;
}

// The whole decision for one Square order, in one call.
export function planOrderSync(input: {
  squareOrder: any;
  existing?: any;
  squareName?: string;
  squareEmail?: string;
  squarePhone?: string;
  profileEmail?: string;
  profilePhone?: string;
  profileId?: string;
  orderFields?: Record<string, any>;
  loyalty?: Record<string, any>;
}): SyncPlan {
  const { squareOrder, existing } = input;

  if (isWebsiteSourced(squareOrder)) {
    return { action: 'skip_website', reason: 'pushed from flavor-isle.com' };
  }
  if (!existing) return { action: 'create' };
  if (!orderNeedsRelink(existing)) return { action: 'none' };

  const patch = relinkPatch(input as any);
  if (Object.keys(patch).length === 0) return { action: 'none' };
  return { action: 'relink', patch };
}