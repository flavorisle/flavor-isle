// Square Loyalty API helpers — backed by SQUARE_ACCESS_TOKEN (a private Square
// access token with LOYALTY_READ/LOYALTY_WRITE) instead of the shared Square
// connector, whose scopes don't include loyalty. Used to unify the online
// "Flavor Isle Star Rewards" with the in-store Square loyalty program.

const SQUARE_API = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2026-09-16';

function authToken(): string {
  const t = Deno.env.get('SQUARE_ACCESS_TOKEN');
  if (!t) throw new Error('SQUARE_ACCESS_TOKEN is not configured. Add it under app secrets.');
  return t;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${authToken()}`,
    'Content-Type': 'application/json',
    'Square-Version': SQUARE_VERSION,
  };
}

export function toE164Phone(raw?: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length > 6) return `+${digits}`;
  return null;
}

export async function getLoyaltyProgram(): Promise<any | null> {
  const res = await fetch(`${SQUARE_API}/loyalty/programs/main`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(`RetrieveLoyaltyProgram failed: ${JSON.stringify(data?.errors || data)}`);
  return data?.program || null;
}

async function getSquareOrderCustomerId(orderId: string): Promise<string | null> {
  const res = await fetch(`${SQUARE_API}/orders/${encodeURIComponent(orderId)}`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(`RetrieveOrder failed: ${JSON.stringify(data?.errors || data)}`);
  return data?.order?.customer_id || null;
}

export async function getAccrualEventForOrder(orderId: string): Promise<any | null> {
  const res = await fetch(`${SQUARE_API}/loyalty/events/search`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ query: { filter: { order_filter: { order_id: orderId } } }, limit: 30 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`SearchLoyaltyEvents failed: ${JSON.stringify(data?.errors || data)}`);
  return (data.events || []).find((event: any) => event.type === 'ACCUMULATE_POINTS') || null;
}

// Check the Square loyalty ledger for an existing ACCUMULATE_POINTS event on a
// given order. Used by the order-status sync's accrual retry to guarantee an
// order is never credited twice — if an event already exists we just mark the
// order accrued and skip, regardless of which idempotency key was used.
export async function hasAccrualEventForOrder(orderId: string): Promise<boolean> {
  if (!orderId) return false;
  const res = await fetch(`${SQUARE_API}/loyalty/events/search`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ query: { filter: { order_filter: { order_id: orderId } } }, limit: 30 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`SearchLoyaltyEvents failed: ${JSON.stringify(data?.errors || data)}`);
  const events = data?.events || [];
  return events.some((e: any) => e.type === 'ACCUMULATE_POINTS' || e.type === 'ACCUMULATE_PROMOTION_POINTS');
}

// Resolve the merchant's primary Square location id — needed by
// AccumulateLoyaltyPoints, which requires a location_id for the purchase.
export async function getLocationId(): Promise<string | null> {
  const res = await fetch(`${SQUARE_API}/locations`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(`ListLocations failed: ${JSON.stringify(data?.errors || data)}`);
  const loc = (data?.locations || []).find((l: any) => l.status === 'ACTIVE');
  return loc?.id || data?.locations?.[0]?.id || null;
}

export async function searchSquareCustomerIdByEmail(email: string): Promise<string | null> {
  if (!email) return null;
  const res = await fetch(`${SQUARE_API}/customers/search`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ query: { filter: { email_address: { exact: email.toLowerCase().trim() } } }, limit: 1 }),
  });
  const data = await res.json();
  return data?.customers?.[0]?.id || null;
}

// Square loyalty accounts are keyed by phone number. Search the Square
// customer directory by phone (E.164) to resolve a customer_id for account
// creation when no loyalty account yet exists.
export async function searchSquareCustomerIdByPhone(phone: string): Promise<string | null> {
  const e164 = toE164Phone(phone);
  if (!e164) return null;
  const res = await fetch(`${SQUARE_API}/customers/search`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ query: { filter: { phone_number: { exact: e164 } } }, limit: 1 }),
  });
  const data = await res.json();
  return data?.customers?.[0]?.id || null;
}

export async function findLoyaltyAccountByCustomer(customerId: string): Promise<any | null> {
  const res = await fetch(`${SQUARE_API}/loyalty/accounts/search`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ query: { customer_ids: [customerId] } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`SearchLoyaltyAccounts failed: ${JSON.stringify(data?.errors || data)}`);
  return data?.loyalty_accounts?.[0] || null;
}

// Primary loyalty lookup — Square loyalty accounts are mapped by phone
// number, so search the loyalty account directory by PHONE mapping (E.164)
// before falling back to a customer_id-based search.
export async function searchLoyaltyAccountByPhone(phone: string): Promise<any | null> {
  const e164 = toE164Phone(phone);
  if (!e164) return null;
  const res = await fetch(`${SQUARE_API}/loyalty/accounts/search`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      query: { mappings: [{ phone_number: e164 }] },
      limit: 1,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`SearchLoyaltyAccounts by phone failed: ${JSON.stringify(data?.errors || data)}`);
  return data?.loyalty_accounts?.[0] || null;
}

export async function createLoyaltyAccount({
  programId,
  customerId,
  phone,
}: {
  programId: string;
  customerId: string;
  phone?: string | null;
}): Promise<any> {
  const loyalty_account: any = { program_id: programId, customer_id: customerId };
  const e164 = toE164Phone(phone);
  if (e164) loyalty_account.mapping = { phone_number: e164 };
  const res = await fetch(`${SQUARE_API}/loyalty/accounts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ loyalty_account, idempotency_key: `enroll:${e164 || customerId}` }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`CreateLoyaltyAccount failed: ${JSON.stringify(data?.errors || data)}`);
  return data?.loyalty_account;
}

export async function accumulateLoyaltyPoints({
  accountId,
  programId,
  orderId,
  locationId,
  idempotencyKey,
}: {
  accountId: string;
  programId: string;
  orderId: string;
  locationId: string;
  idempotencyKey?: string;
}): Promise<any | null> {
  const res = await fetch(`${SQUARE_API}/loyalty/accounts/${accountId}/accumulate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      accumulate_points: { loyalty_program_id: programId, order_id: orderId },
      location_id: locationId,
      idempotency_key: idempotencyKey || crypto.randomUUID(),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`AccumulateLoyaltyPoints failed: ${JSON.stringify(data?.errors || data)}`);
  return data;
}

// Flat star grant/ deduction outside the spend-based accrual rules. Used to
// award the new-member welcome bonus to first-time enrollees.
export async function adjustLoyaltyPoints({
  accountId,
  points,
  reason,
  idempotencyKey,
}: {
  accountId: string;
  points: number;
  reason: string;
  idempotencyKey?: string;
}): Promise<any | null> {
  const res = await fetch(`${SQUARE_API}/loyalty/accounts/${accountId}/adjust`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      adjust_points: { points, reason },
      idempotency_key: idempotencyKey || crypto.randomUUID(),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`AdjustLoyaltyPoints failed: ${JSON.stringify(data?.errors || data)}`);
  return data?.loyalty_account || null;
}

export function describeRewardTier(tier: any): string {
  const def = tier?.definition || {};
  if (def.discount_type === 'FIXED_AMOUNT') {
    const cents = def.fixed_discount_money?.amount || 0;
    return `$${Math.round(cents / 100)} off`;
  }
  if (def.discount_type === 'FIXED_PERCENTAGE') {
    const pct = def.percentage_discount || 0;
    if ((def.scope === 'ITEM_VARIATION' || def.scope === 'ITEM') && pct >= 100) return 'Free item';
    return `${pct}% off`;
  }
  if (def.discount_type === 'FIXED_PRICE') {
    const cents = def.item_price_money?.amount || 0;
    return `Item for $${(cents / 100).toFixed(2)}`;
  }
  return def.discount_type ? String(def.discount_type).replace(/_/g, ' ').toLowerCase() : 'Reward';
}

export function earnTextForProgram(program: any): string | null {
  const rules = program?.accrual_rules || [];
  for (const r of rules) {
    const pts = r.points || 0;
    const plural = pts === 1 ? '' : 's';
    if (r.accrual_type === 'SPEND') {
      const cents = r.spend_data?.amount_money?.amount || 0;
      return `Earn ${pts} star${plural} per $${Math.max(1, Math.round(cents / 100))} spent`;
    }
    if (r.accrual_type === 'VISIT') return `Earn ${pts} star${plural} per visit`;
    if (r.accrual_type === 'ITEM') return `Earn ${pts} star${plural} per qualifying item`;
    if (r.accrual_type === 'CATEGORY') return `Earn ${pts} star${plural} per qualifying purchase`;
  }
  return null;
}

// Find (or create) the buyer's loyalty account, then accrue square-computed
// points for a paid Square order. Called from the Stripe webhook after an
// online order is tendered. Returns the stars earned + resulting balance so
// callers (order confirmation emails) can tell the customer what they got.
export async function accrueForOrder({
  squareOrderId,
  email,
  phone,
  enroll = false,
  directWebOrderId,
  skipAccrual = false,
}: {
  squareOrderId: string;
  email: string;
  phone?: string;
  enroll?: boolean;
  directWebOrderId?: string;
  skipAccrual?: boolean;
}): Promise<{ pointsEarned: number; balance: number; newlyEnrolled: boolean }> {
  const program = await getLoyaltyProgram();
  if (!program?.id) throw new Error('Square loyalty program not found');
  if (program.status === 'INACTIVE') throw new Error('Square loyalty program is not active');

  const locationId = await getLocationId();
  if (!locationId) throw new Error('Could not resolve Square location for loyalty accrual');

  // A phone is the member identity; never enroll a caller just because an email
  // matches another Square customer. Only a paid order with explicit opt-in may
  // create a new account. Existing members can earn without opting in again.
  if (!toE164Phone(phone)) throw new Error('A valid member phone is required');
  let account = await searchLoyaltyAccountByPhone(phone);
  let newlyEnrolled = false;
  if (!account) {
    const customerId = await searchSquareCustomerIdByPhone(phone) || (enroll ? await getSquareOrderCustomerId(squareOrderId) : null);
    if (customerId) {
      const matched = await findLoyaltyAccountByCustomer(customerId);
      if (matched && toE164Phone(matched.mapping?.phone_number) === toE164Phone(phone)) account = matched;
    }
    if (!account && enroll) {
      if (!customerId) throw new Error('No Square customer found for enrollment');
      account = await createLoyaltyAccount({ programId: program.id, customerId, phone });
      newlyEnrolled = true;
    }
  }
  if (!account) throw new Error('Phone is not enrolled in Star Rewards');

  const accrual = skipAccrual ? null : await accumulateLoyaltyPoints({ accountId: account.id, programId: program.id, orderId: squareOrderId, locationId, idempotencyKey: `loyalty-accrue:${squareOrderId}` });
  const event = accrual?.event || accrual?.events?.[0] || (skipAccrual ? await getAccrualEventForOrder(squareOrderId) : null);
  const pointsEarned = Number(event?.accumulate_points?.points || 0);
  // Bonus is based on Square's actual earn event, not untrusted cart prices.
  // A deterministic key makes webhook retries safe after a partial success.
  if (directWebOrderId) {
    const standardEarn = pointsEarned;
    const bonus = standardEarn >= 10 ? Math.max(1, Math.floor(standardEarn * 0.10)) : Math.floor(standardEarn * 0.10);
    if (bonus > 0) await adjustLoyaltyPoints({ accountId: account.id, points: bonus, reason: 'Direct order bonus', idempotencyKey: `direct-web-bonus:${directWebOrderId}` });
  }
  return { pointsEarned, balance: (account.balance || 0) + pointsEarned, newlyEnrolled };
}

// Build the status payload shown on the Account rewards screen. Finds
// the buyer's loyalty account without enrolling them and
// returns their live balance, lifetime stars, and available reward tiers.
export async function buildLoyaltyStatus({ email, phone }: { email: string; phone?: string }): Promise<any> {
  const program = await getLoyaltyProgram();
  const programName = program?.name || 'Flavor Isle Star Rewards';

  const result: any = {
    programName,
    programStatus: program?.status || 'UNKNOWN',
    balance: 0,
    lifetimePoints: 0,
    hasAccount: false,
    needsPhone: false,
    earnText: earnTextForProgram(program),
    rewardTiers: [],
  };

  if (!program?.id) return result;

  (program.reward_tiers || []).forEach((t: any) => {
    result.rewardTiers.push({
      id: t.id,
      name: t.name,
      points: t.points,
      description: describeRewardTier(t),
      scope: t.definition?.scope || 'ORDER',
      discountType: t.definition?.discount_type || null,
      percentage: t.definition?.percentage_discount || 0,
      fixedAmountCents: t.definition?.fixed_discount_money?.amount || 0,
    });
  });

  if (program.status !== 'ACTIVE') return result;

  // Phone is the primary identifier for Square loyalty — look up the account
  // by phone mapping first, then fall back to email-based customer lookup.
  // Each lookup is wrapped so a transient Square API error doesn't wipe out
  // the entire status — the user still sees the program info and reward tiers.
  let account: any | null = null;
  if (phone) {
    try { account = await searchLoyaltyAccountByPhone(phone); }
    catch (e) { console.error('Loyalty phone search failed:', (e as Error).message); }
  }

  if (!account) {
    let customerId: string | null = null;
    try {
      if (phone) customerId = await searchSquareCustomerIdByPhone(phone);
      if (!customerId && email) customerId = await searchSquareCustomerIdByEmail(email);
    } catch (e) {
      console.error('Square customer lookup failed:', (e as Error).message);
    }
    if (!customerId) {
      result.needsPhone = !toE164Phone(phone);
      return result;
    }
    try { account = await findLoyaltyAccountByCustomer(customerId); }
    catch (e) { console.error('Loyalty customer search failed:', (e as Error).message); }
    if (!account) {
      const e164 = toE164Phone(phone);
      if (!e164) {
        result.needsPhone = true;
        return result;
      }
      // Status is read-only. Enrollment happens only when explicitly requested
      // at checkout and payment is confirmed, not when someone looks up a phone.
    }
  }

  if (account) {
    result.hasAccount = true;
    result.needsPhone = false;
    result.balance = account.balance || 0;
    result.lifetimePoints = account.lifetime_points || 0;
    result.accountId = account.id;
  }
  return result;
}

// Redeem a Square loyalty reward tier for a buyer — deducts points from their
// loyalty account and creates a Square redemption record. Called from the
// Stripe webhook after an online order paid with an applied reward. A
// deterministic idempotency key (per order + tier) keeps webhook retries from
// double-deducting points.
export async function redeemReward({
  email,
  phone,
  rewardTierId,
  idempotencyKey,
}: {
  email: string;
  phone?: string;
  rewardTierId: string;
  idempotencyKey?: string;
}): Promise<void> {
  if (!rewardTierId) return;
  const program = await getLoyaltyProgram();
  if (!program?.id) throw new Error('Square loyalty program not found');

  let account: any | null = null;
  if (phone) {
    try { account = await searchLoyaltyAccountByPhone(phone); }
    catch (e) { console.error('Loyalty phone search failed:', (e as Error).message); }
  }
  if (!account) {
    let customerId: string | null = null;
    if (phone) customerId = await searchSquareCustomerIdByPhone(phone);
    if (!customerId && email) customerId = await searchSquareCustomerIdByEmail(email);
    if (!customerId) throw new Error('No Square customer found for loyalty redemption');
    account = await findLoyaltyAccountByCustomer(customerId);
  }
  if (!account) throw new Error('No loyalty account found to redeem from');

  const res = await fetch(`${SQUARE_API}/loyalty/rewards`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      loyalty_reward: { loyalty_account_id: account.id, reward_tier_id: rewardTierId },
      idempotency_key: idempotencyKey || crypto.randomUUID(),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`CreateLoyaltyReward failed: ${JSON.stringify(data?.errors || data)}`);
}

// Validate a claimed reward discount against the Square Loyalty program + the
// buyer's account (keyed by phone) BEFORE the reward is applied to a charge.
// Verifies: the tier exists and is redeemable online (ORDER-scope, FIXED_AMOUNT
// or sub-100% FIXED_PERCENTAGE), the account exists and has enough stars, and
// the claimed discount matches the exact discount the tier produces for this
// subtotal. Returns the authoritative exact discount so the caller charges
// with it instead of trusting the client value. Does NOT touch the app Loyalty
// table — Square loyalty is the only rewards authority. A missing rewardTierId
// is a guest checkout with no reward → ok (no validation needed).
export async function validateRewardDiscount(opts: {
  phone?: string;
  email?: string;
  rewardTierId: string;
  claimedDiscount: number;
  subtotal: number;
}): Promise<{ ok: boolean; error?: string; exactDiscount?: number; tier?: any; account?: any }> {
  const { phone, email, rewardTierId, claimedDiscount, subtotal } = opts;
  if (!rewardTierId) return { ok: true, exactDiscount: 0 };
  try {
    const program = await getLoyaltyProgram();
    if (!program?.id) return { ok: false, error: 'Star Rewards is unavailable right now. Please remove your reward and try again, or continue without it.' };
    if (program.status !== 'ACTIVE') return { ok: false, error: 'Star Rewards is not currently active.' };
    const tier = (program.reward_tiers || []).find((t: any) => t.id === rewardTierId);
    if (!tier) return { ok: false, error: 'This reward is no longer available. Please re-apply your reward or continue without it.' };
    const def = tier.definition || {};
    if (def.scope && def.scope !== 'ORDER') return { ok: false, error: 'This reward can only be redeemed in store.' };
    let exact = 0;
    if (def.discount_type === 'FIXED_AMOUNT') {
      exact = (def.fixed_discount_money?.amount || 0) / 100;
    } else if (def.discount_type === 'FIXED_PERCENTAGE') {
      const pct = def.percentage_discount || 0;
      if (pct <= 0 || pct >= 100) return { ok: false, error: 'This reward can only be redeemed in store.' };
      exact = +((subtotal * pct) / 100).toFixed(2);
    } else {
      return { ok: false, error: 'This reward can only be redeemed in store.' };
    }
    exact = +Math.min(exact, Math.max(0, subtotal)).toFixed(2);
    // Resolve the loyalty account by phone (primary), then email.
    let account: any = null;
    if (phone) {
      try { account = await searchLoyaltyAccountByPhone(phone); }
      catch (e) { console.error('validateRewardDiscount phone search failed:', (e as Error).message); }
    }
    if (!account) {
      let customerId: string | null = null;
      try {
        if (phone) customerId = await searchSquareCustomerIdByPhone(phone);
        if (!customerId && email) customerId = await searchSquareCustomerIdByEmail(email);
      } catch { /* fall through */ }
      if (customerId) {
        try { account = await findLoyaltyAccountByCustomer(customerId); }
        catch (e) { console.error('validateRewardDiscount customer search failed:', (e as Error).message); }
      }
    }
    if (!account) return { ok: false, error: 'No Star Rewards account found for your phone number. Please remove your reward or add the phone number linked to your rewards.' };
    if ((account.balance || 0) < (tier.points || 0)) {
      return { ok: false, error: "You don't have enough stars for this reward yet." };
    }
    if (Math.abs(exact - Number(claimedDiscount || 0)) > 0.01) {
      return { ok: false, error: 'Your reward discount has changed. Please re-apply your reward and try again.' };
    }
    return { ok: true, exactDiscount: exact, tier, account };
  } catch (e) {
    console.error('validateRewardDiscount failed:', (e as Error).message);
    return { ok: false, error: 'Star Rewards could not be verified right now. Please remove your reward and try again, or continue without it.' };
  }
}

// Find a customer's Square loyalty account by phone/email lookup (read-only,
// no account creation side effect). Used by automations that need the current
// balance without enrolling new accounts.
export async function findLoyaltyAccountByEmail({
  email,
  phone,
}: {
  email: string;
  phone?: string;
}): Promise<any | null> {
  let account: any | null = null;
  if (phone) {
    try { account = await searchLoyaltyAccountByPhone(phone); }
    catch (e) { console.error('Loyalty phone search failed:', (e as Error).message); }
  }
  if (!account) {
    let customerId: string | null = null;
    if (phone) customerId = await searchSquareCustomerIdByPhone(phone);
    if (!customerId && email) customerId = await searchSquareCustomerIdByEmail(email);
    if (!customerId) return null;
    try { account = await findLoyaltyAccountByCustomer(customerId); }
    catch (e) { console.error('Loyalty customer search failed:', (e as Error).message); }
  }
  return account;
}

// Grant flat loyalty points to a customer's Square loyalty account by
// email/phone lookup. Used by win-back and birthday email automations to
// award free-item points outside the spend-based accrual rules. Returns the
// resulting balance + account id, or null if no loyalty account could be
// resolved (customer not in Square directory or no loyalty account).
export async function grantLoyaltyPointsByEmail({
  email,
  phone,
  points,
  reason,
  idempotencyKey,
}: {
  email: string;
  phone?: string;
  points: number;
  reason: string;
  idempotencyKey?: string;
}): Promise<{ balance: number; accountId: string } | null> {
  const account = await findLoyaltyAccountByEmail({ email, phone });
  if (!account) return null;

  const updated = await adjustLoyaltyPoints({
    accountId: account.id,
    points,
    reason,
    idempotencyKey,
  });
  return { balance: updated?.balance ?? (account.balance || 0) + points, accountId: account.id };
}