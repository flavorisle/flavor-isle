import { normalizePhone, phoneDigits } from './normalizePhone.ts';

// Linking an order to the customer it belongs to (issue #96, section A).
//
// Section A's backfill and every order-creation path resolve the same way:
// match the CustomerProfile by NORMALIZED PHONE first, then by email. A profile
// that cannot be found leaves the order unlinked rather than guessing — an
// unlinked in-store order is countable and visible on the Customers page.

// The profile id for a phone/email pair, or '' when nothing matches. Never
// throws: a directory lookup must not be able to fail an order.
export async function resolveCustomerProfileId(
  base44: any,
  { phone, email }: { phone?: string | null; email?: string | null },
): Promise<string> {
  const digits = phoneDigits(phone);
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (digits) {
    try {
      const byPhone = await base44.asServiceRole.entities.CustomerProfile.filter({
        phone: { $regex: digits, $options: 'i' },
      });
      if (byPhone?.length) return byPhone[0].id;
    } catch (err) {
      console.warn('customer profile phone match failed:', (err as Error).message);
    }
  }

  if (cleanEmail) {
    try {
      const byEmail = await base44.asServiceRole.entities.CustomerProfile.filter({ email: cleanEmail });
      if (byEmail?.length) return byEmail[0].id;
    } catch (err) {
      console.warn('customer profile email match failed:', (err as Error).message);
    }
  }

  return '';
}

// The two fields every newly created order carries: the normalized phone, and
// the matching profile id when there is one.
export async function customerLinkFields(
  base44: any,
  { phone, email }: { phone?: string | null; email?: string | null },
): Promise<{ normalized_phone: string; customer_id: string }> {
  return {
    normalized_phone: normalizePhone(phone),
    customer_id: await resolveCustomerProfileId(base44, { phone, email }),
  };
}

// A lookup map of every CustomerProfile, keyed by normalized phone and by
// lowercased email, for the one-time backfill. Reads the whole directory in
// pages (the directory is small: hundreds of rows) so the pass costs a handful
// of calls instead of one query per order.
export async function loadCustomerProfileIndex(base44: any) {
  const byPhone = new Map<string, string>();
  const byEmail = new Map<string, string>();

  // The server-side SDK takes filter(query, sort, limit, skip) and returns an
  // array — the options form some newer clients use comes back as an array here
  // too, so read in explicit pages by offset rather than by cursor.
  const PAGE = 500;
  for (let page = 0; page < 20; page++) {
    const rows = await base44.asServiceRole.entities.CustomerProfile
      .filter({}, '-created_date', PAGE, page * PAGE)
      .catch(() => []);
    const items = Array.isArray(rows) ? rows : [];
    if (items.length === 0) break;
    for (const profile of items) {
      const normalized = normalizePhone(profile.phone);
      if (normalized && !byPhone.has(normalized)) byPhone.set(normalized, profile.id);
      const email = String(profile.email || '').trim().toLowerCase();
      if (email && !byEmail.has(email)) byEmail.set(email, profile.id);
    }
    if (items.length < PAGE) break;
  }

  return { byPhone, byEmail };
}

// The profile id for an existing order, from the same precedence the live path
// uses: normalized phone first, then email.
export function linkForOrder(
  index: { byPhone: Map<string, string>; byEmail: Map<string, string> },
  order: any,
): { normalized_phone: string; customer_id: string } {
  const normalized_phone = normalizePhone(order?.customer_phone);
  const email = String(order?.customer_email || '').trim().toLowerCase();
  const customer_id = index.byPhone.get(normalized_phone) || index.byEmail.get(email) || '';
  return { normalized_phone, customer_id };
}