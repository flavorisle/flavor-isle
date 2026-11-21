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

// Issue #325 Part 1: a stored address that is real but belongs to nobody. It is
// not any registered site account, and the phone on the order resolves to a
// different profile email — so the order is sitting in the wrong place.
function emailNeedsMapping(
  storedEmail: any,
  mappedEmail: any,
  registeredEmails?: Set<string> | string[],
): boolean {
  const stored = String(storedEmail || '').trim().toLowerCase();
  const mapped = String(mappedEmail || '').trim();
  if (!stored || !mapped || isPlaceholderEmail(stored)) return false;
  if (stored === mapped.toLowerCase()) return false;
  const registered = registeredEmails instanceof Set
    ? registeredEmails
    : new Set(registeredEmails || []);
  return !registered.has(stored);
}

// An already-synced Order is worth a second look when Square can now resolve
// who paid it: a placeholder email, any of the identity fields still empty, or
// (issue #325) a real address that belongs to no registered account while the
// order's own phone resolves to a profile email.
export function orderNeedsRelink(
  existing: any,
  opts?: { mappedEmail?: string; registeredEmails?: Set<string> | string[] },
): boolean {
  if (!existing) return false;
  if (
    isPlaceholderEmail(existing.customer_email) ||
    !existing.customer_phone ||
    !existing.customer_id ||
    !existing.square_customer_id
  ) {
    return true;
  }
  return emailNeedsMapping(existing.customer_email, opts?.mappedEmail, opts?.registeredEmails);
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
  mappedEmail,
  registeredEmails,
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
  // Issue #325 Part 1: the email the order's own phone resolves to, and the
  // addresses that belong to a registered site account.
  mappedEmail?: string;
  registeredEmails?: Set<string> | string[];
}): Record<string, any> {
  const patch: Record<string, any> = {};
  const storedEmail = String(existing.customer_email || '');
  const srEmail = String(squareEmail || '').trim();
  const profileMail = String(profileEmail || '').trim();

  // Issue #277: a patch carries only a value that CHANGES something. An order
  // that already holds no email (a cash walk-in) used to be re-patched with ''
  // on every single run, so it relinked forever and burned the entity-update
  // budget — hundreds of no-op writes per sync.
  let targetEmail: string | undefined;
  if (srEmail && (!storedEmail || isPlaceholderEmail(storedEmail))) {
    targetEmail = srEmail;
  } else if (isPlaceholderEmail(storedEmail)) {
    // A placeholder (or an address that cannot receive mail) is no email at all.
    targetEmail = profileMail;
  }
  // Issue #325 Part 1: a real address that is not any registered account, while
  // the order's normalized phone maps to a profile email, is replaced by the
  // mapped one. An address that IS a registered account is never touched.
  if (targetEmail === undefined && emailNeedsMapping(storedEmail, mappedEmail, registeredEmails)) {
    targetEmail = String(mappedEmail || '').trim();
  }
  if (targetEmail !== undefined && targetEmail !== storedEmail) {
    patch.customer_email = targetEmail;
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
  mappedEmail?: string;
  registeredEmails?: Set<string> | string[];
}): SyncPlan {
  const { squareOrder, existing } = input;

  if (isWebsiteSourced(squareOrder)) {
    return { action: 'skip_website', reason: 'pushed from flavor-isle.com' };
  }
  if (!existing) return { action: 'create' };
  if (!orderNeedsRelink(existing, {
    mappedEmail: input.mappedEmail,
    registeredEmails: input.registeredEmails,
  })) return { action: 'none' };

  const patch = relinkPatch(input as any);
  if (Object.keys(patch).length === 0) return { action: 'none' };
  return { action: 'relink', patch };
}