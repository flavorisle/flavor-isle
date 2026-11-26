import { normalizePhone } from './normalizePhone.ts';
import { normalizeEmail } from './emailSafety.ts';
import { readAllRecords } from './readAll.ts';

// ── Email consent ──
// unsubscribeEmail only flips EmailSubscriber.status; it never adds a
// BlockedContact, so the block list alone cannot tell us someone opted out.
// One decision, in the module every segment/lapse send built from this audience
// shares: a subscriber row that is not 'active' holds the send. 'unsubscribed'
// and 'bounced' are recorded opt-outs and 'pending' is an address whose double
// opt-in was never confirmed. A customer with no subscriber row has no opt-out
// on file, exactly as the invite sweep treats them.
export function subscriberHoldReason(subscriber: any): string | null {
  const status = String(subscriber?.status || '').trim().toLowerCase();
  if (!status) return null;
  return status === 'active' ? null : `subscriber_${status}`;
}

export async function loadSubscriberConsent(base44) {
  const rows = await readAllRecords(options =>
    base44.asServiceRole.entities.EmailSubscriber.list(options));
  const held = new Map<string, string>();
  for (const row of rows) {
    const email = normalizeEmail(row?.email);
    const reason = subscriberHoldReason(row);
    // Any non-active row holds the address, even beside an active one.
    if (email && reason && !held.has(email)) held.set(email, reason);
  }
  return {
    holdReason(email: string): string | null {
      return held.get(normalizeEmail(email)) || null;
    },
  };
}

// CustomerProfile has no stored last-purchase field. Like the admin dashboard,
// derive it from purchases in BOTH channels, matching the directory customer.
export async function loadWinbackCustomers(base44) {
  const entities = base44.asServiceRole.entities;
  const profiles = await readAllRecords(options =>
    entities.CustomerProfile.list({ ...options, sort: '-created_date' }));
  const byId = new Map();
  const byPhone = new Map();
  const byEmail = new Map();
  for (const profile of profiles) {
    byId.set(profile.id, profile);
    const phone = normalizePhone(profile.phone);
    const email = normalizeEmail(profile.email);
    if (phone && !byPhone.has(phone)) byPhone.set(phone, profile);
    if (email && !byEmail.has(email)) byEmail.set(email, profile);
  }

  const customers = new Map();
  let cursor = null;
  do {
    // Include recent purchases too: a recent counter visit must prevent a
    // win-back even when the same person's last ONLINE order was months ago.
    const page = await entities.Order.filter({
      status: { $ne: 'cancelled' },
      payment_status: { $nin: ['failed', 'refunded'] },
      $or: [{ payment_status: 'paid' }, { status: { $in: ['completed', 'delivered'] } }],
    }, { sort: '-created_date', limit: 500, ...(cursor ? { cursor } : {}) });
    for (const order of page.items) {
      const phone = order.normalized_phone || normalizePhone(order.customer_phone);
      const orderEmail = normalizeEmail(order.customer_email);
      const profile = byId.get(order.customer_id) || byPhone.get(phone) || byEmail.get(orderEmail);
      const email = normalizeEmail(profile?.email || orderEmail);
      const created = new Date(order.created_date);
      if (!email || !Number.isFinite(created.getTime())) continue;
      const existing = customers.get(email);
      if (!existing || created > existing.created) {
        customers.set(email, {
          created,
          order: {
            id: order.id,
            customer_email: email,
            customer_name: profile?.name || order.customer_name,
            customer_phone: profile?.phone || order.customer_phone,
          },
        });
      }
    }
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return customers;
}