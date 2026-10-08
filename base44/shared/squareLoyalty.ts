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

// ── Reward tier pricing-rule resolution (issue #83, Part B) ─────────────────
//
// A Square loyalty reward tier no longer carries its own discount definition:
// it carries a `pricing_rule_reference` pointing at a PRICING_RULE catalog
// object, and the real discount type, scope and qualifying products live in
// that rule plus its related DISCOUNT / PRODUCT_SET objects. Without resolving
// them the checkout saw no usable tier data at all, so every reward looked
// in-store-only. These helpers read each rule at its pinned catalog version,
// resolve it into a discount this checkout can price, and cache the result for
// ten minutes — a Square hiccup falls back to the last good read, and a tier
// that cannot be resolved is treated as in-store-only.

const TIER_CACHE_MS = 10 * 60 * 1000;

export type ResolvedTierDiscount = {
  /** ORDER discounts the whole subtotal; ITEM discounts the cheapest qualifying line. */
  scope: 'ORDER' | 'ITEM';
  discountType: 'FIXED_AMOUNT' | 'FIXED_PERCENTAGE' | null;
  percentage: number;
  fixedAmountCents: number;
  /** Catalog ids (item variations, their parent items, categories) this tier applies to. */
  qualifyingIds: string[];
  /** The rule applies to every product in the catalog. */
  allItems: boolean;
  /** Customer-facing label built from the resolved rule, never hardcoded copy. */
  label: string;
};

let tierDiscountCache: { key: string; at: number; value: Map<string, ResolvedTierDiscount> } | null = null;

function pricingRuleReference(tier: any): { object_id: string; catalog_version?: number } | null {
  const ref = tier?.pricing_rule_reference || tier?.definition?.pricing_rule_reference;
  return ref?.object_id ? ref : null;
}

function tierCacheKey(tiers: any[]): string {
  return tiers
    .map((t: any) => {
      const ref = pricingRuleReference(t);
      return `${t.id}:${ref?.object_id || ''}:${ref?.catalog_version || ''}`;
    })
    .join('|');
}

async function fetchPricingRule(reference: { object_id: string; catalog_version?: number }): Promise<{ object: any; related: any[] }> {
  const params = new URLSearchParams({ include_related_objects: 'true' });
  if (reference.catalog_version) params.set('catalog_version', String(reference.catalog_version));
  const res = await fetch(`${SQUARE_API}/catalog/object/${encodeURIComponent(reference.object_id)}?${params.toString()}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`RetrieveCatalogObject failed: ${JSON.stringify(data?.errors || data)}`);
  return { object: data?.object || {}, related: data?.related_objects || [] };
}

// One batch retrieve resolves every qualifying item variation to its parent
// item, because a cart line carries the item id (and its chosen variation only
// when the variation is a pickable size modifier).
async function resolveParentItemIds(variationIds: string[]): Promise<Map<string, string>> {
  const parents = new Map<string, string>();
  const unique = [...new Set(variationIds)].filter(Boolean).slice(0, 100);
  if (!unique.length) return parents;
  const res = await fetch(`${SQUARE_API}/catalog/batch-retrieve`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ object_ids: unique }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`BatchRetrieveCatalogObjects failed: ${JSON.stringify(data?.errors || data)}`);
  for (const obj of data?.objects || []) {
    const itemId = obj?.item_variation_data?.item_id;
    if (itemId) parents.set(obj.id, itemId);
  }
  return parents;
}

// The reward's own name usually reads like an item ("A 8 oz Ice Cream Cup or
// Side"), so only prefix "Free" when it doesn't already say so.
function freeItemLabel(name: string): string {
  const clean = String(name || '').trim();
  if (!clean) return 'Free item';
  const stripped = clean.replace(/^(a|an|one)\s+/i, '');
  if (/^free\b/i.test(stripped)) return stripped.charAt(0).toUpperCase() + stripped.slice(1);
  return `Free ${stripped}`;
}

function rewardLabel(
  discountType: string | null,
  percentage: number,
  fixedAmountCents: number,
  scope: 'ORDER' | 'ITEM',
  name: string,
): string {
  if (discountType === 'FIXED_AMOUNT' && fixedAmountCents > 0) {
    const dollars = fixedAmountCents / 100;
    return `$${Number.isInteger(dollars) ? dollars.toFixed(0) : dollars.toFixed(2)} off`;
  }
  if (discountType === 'FIXED_PERCENTAGE' && percentage > 0) {
    if (scope === 'ITEM' && percentage >= 100) return freeItemLabel(name);
    return `${percentage}% off`;
  }
  return name || 'Reward';
}

// Resolve one tier: prefer its Square pricing rule, fall back to a legacy
// inline definition for programs that still return one.
function resolveTier(
  tier: any,
  rule: { object: any; related: any[] } | null,
  parents: Map<string, string>,
): ResolvedTierDiscount | null {
  const def = tier?.definition || {};
  const ruleData = rule?.object?.pricing_rule_data || rule?.object?.pricing_rule || {};
  const discount = (rule?.related || []).find((o: any) => o.type === 'DISCOUNT')?.discount_data || null;
  const productSet = (rule?.related || []).find((o: any) => o.type === 'PRODUCT_SET')?.product_set_data || null;

  const discountType = discount?.discount_type || def.discount_type || null;
  if (discountType !== 'FIXED_AMOUNT' && discountType !== 'FIXED_PERCENTAGE') return null;
  const percentage = Number(discount?.percentage ?? def.percentage_discount ?? 0) || 0;
  const fixedAmountCents = Number(discount?.amount_money?.amount ?? def.fixed_discount_money?.amount ?? 0) || 0;
  if (discountType === 'FIXED_AMOUNT' && fixedAmountCents <= 0) return null;
  if (discountType === 'FIXED_PERCENTAGE' && percentage <= 0) return null;

  const allItems = productSet?.all_products === true;
  const catalogIds: string[] = [
    ...(productSet?.product_ids_any || []),
    ...(productSet?.product_ids_all || []),
    ...(productSet?.category_ids || []),
  ];
  const target = ruleData.discount_target_scope;
  const scope: 'ORDER' | 'ITEM' = rule
    ? (target === 'WHOLE_PURCHASE' ? 'ORDER' : target === 'LINE_ITEM' ? 'ITEM' : allItems ? 'ORDER' : 'ITEM')
    : (def.scope && def.scope !== 'ORDER' ? 'ITEM' : 'ORDER');
  // An order-level percentage must be under 100% to be priceable online; 100%
  // is the free-item (line level) case.
  if (scope === 'ORDER' && discountType === 'FIXED_PERCENTAGE' && percentage >= 100) return null;
  // A line-level discount with neither a product set nor "all products" can't
  // be priced here, so it stays in-store-only.
  if (scope === 'ITEM' && !allItems && !catalogIds.length) return null;

  const qualifyingIds = scope === 'ITEM'
    ? [...catalogIds, ...catalogIds.map((id) => parents.get(id)).filter(Boolean) as string[]]
    : [];

  return {
    scope,
    discountType,
    percentage,
    fixedAmountCents,
    qualifyingIds: [...new Set(qualifyingIds)],
    allItems,
    label: rewardLabel(discountType, percentage, fixedAmountCents, scope, discount?.name || tier?.name || ''),
  };
}

// Resolve every reward tier's real discount data, keyed by tier id. Tiers that
// don't resolve are absent from the map (in-store-only).
export async function getRewardTierDiscounts(program: any): Promise<Map<string, ResolvedTierDiscount>> {
  const tiers: any[] = Array.isArray(program?.reward_tiers) ? program.reward_tiers : [];
  const resolved = new Map<string, ResolvedTierDiscount>();
  if (!tiers.length) return resolved;

  const key = tierCacheKey(tiers);
  const cache = tierDiscountCache && tierDiscountCache.key === key ? tierDiscountCache : null;
  if (cache && Date.now() - cache.at < TIER_CACHE_MS) return cache.value;

  let failed = false;
  const reads = await Promise.all(tiers.map(async (tier: any) => {
    const reference = pricingRuleReference(tier);
    if (!reference) return { tier, rule: null as { object: any; related: any[] } | null };
    try {
      return { tier, rule: await fetchPricingRule(reference) };
    } catch (e) {
      failed = true;
      console.error(`Reward tier "${tier?.name || tier?.id}" pricing rule lookup failed:`, (e as Error).message);
      return { tier, rule: null as { object: any; related: any[] } | null };
    }
  }));

  const variationIds: string[] = [];
  for (const { rule } of reads) {
    if (!rule) continue;
    const productSet = (rule.related || []).find((o: any) => o.type === 'PRODUCT_SET')?.product_set_data;
    variationIds.push(...(productSet?.product_ids_any || []), ...(productSet?.product_ids_all || []));
  }

  let parents = new Map<string, string>();
  if (variationIds.length) {
    try {
      parents = await resolveParentItemIds(variationIds);
    } catch (e) {
      failed = true;
      console.error('Reward tier product lookup failed:', (e as Error).message);
    }
  }

  for (const { tier, rule } of reads) {
    const value = resolveTier(tier, rule, parents);
    if (value) resolved.set(tier.id, value);
  }

  // A Square failure serves the last good read rather than making every reward
  // look in-store-only; only a complete read is cached.
  if (failed && cache) return cache.value;
  if (!failed) tierDiscountCache = { key, at: Date.now(), value: resolved };
  return resolved;
}

function lineMatchesQualifyingIds(line: any, ids: Set<string>, allItems: boolean): boolean {
  if (allItems) return true;
  if (!ids.size) return false;
  const candidates = [
    line?.catalog_object_id,
    line?.square_item_id,
    line?.square_category_id,
    ...(Array.isArray(line?.selectedModifiers) ? line.selectedModifiers.map((m: any) => m?.id) : []),
  ];
  return candidates.some((candidate) => !!candidate && ids.has(String(candidate)));
}

function cheapestQualifyingLinePrice(cartItems: any[], resolved: ResolvedTierDiscount): number | null {
  const ids = new Set(resolved.qualifyingIds);
  const prices = (Array.isArray(cartItems) ? cartItems : [])
    .filter((line) => lineMatchesQualifyingIds(line, ids, resolved.allItems))
    .map((line) => Number(line?.price) || 0)
    .filter((price) => price > 0);
  return prices.length ? Math.min(...prices) : null;
}

// The authoritative discount a resolved tier produces for this cart. Mirrors
// computeDiscount in src/lib/rewardDiscount.js, which prices the same rule in
// the checkout UI. Returns null when the tier can't be applied to this cart.
export function tierDiscountForCart(
  resolved: ResolvedTierDiscount | null,
  subtotal: number,
  cartItems: any[],
): number | null {
  if (!resolved) return null;
  const sub = Math.max(0, Number(subtotal) || 0);
  if (resolved.scope === 'ORDER') {
    const exact = resolved.discountType === 'FIXED_AMOUNT'
      ? resolved.fixedAmountCents / 100
      : (sub * resolved.percentage) / 100;
    if (!(exact > 0)) return null;
    return +Math.min(exact, sub).toFixed(2);
  }
  const linePrice = cheapestQualifyingLinePrice(cartItems, resolved);
  if (linePrice == null) return null;
  const exact = resolved.discountType === 'FIXED_AMOUNT'
    ? Math.min(resolved.fixedAmountCents / 100, linePrice)
    : (linePrice * resolved.percentage) / 100;
  if (!(exact > 0)) return null;
  return +Math.min(exact, sub).toFixed(2);
}

// Label for a reward tier. Uses the resolved Square rule when available and
// falls back to a legacy inline definition otherwise.
export function describeRewardTier(tier: any, resolved?: ResolvedTierDiscount | null): string {
  if (resolved?.label) return resolved.label;
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

  // Reward tiers carry only a pricing-rule reference now, so resolve each
  // rule to its real discount before reporting the tiers.
  const tierDiscounts = await getRewardTierDiscounts(program).catch((e: Error) => {
    console.error('Reward tier resolution failed:', e.message);
    return new Map<string, ResolvedTierDiscount>();
  });

  (program.reward_tiers || []).forEach((t: any) => {
    const resolved = tierDiscounts.get(t.id) || null;
    result.rewardTiers.push({
      id: t.id,
      name: t.name,
      points: t.points,
      description: describeRewardTier(t, resolved),
      scope: resolved?.scope || 'ORDER',
      discountType: resolved?.discountType || null,
      percentage: resolved?.percentage || 0,
      fixedAmountCents: resolved?.fixedAmountCents || 0,
      qualifyingItemIds: resolved?.qualifyingIds || [],
      allItems: resolved?.allItems === true,
      redeemableOnline: !!resolved,
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
// Verifies: the tier exists and resolves to a discount this checkout can price
// (order scope, or a line-item rule with a qualifying item in the cart), the
// account exists and has enough stars, and the claimed discount matches the
// exact discount the tier produces for this cart. Returns the authoritative
// exact discount so the caller charges with it instead of trusting the client
// value. Does NOT touch the app Loyalty table — Square loyalty is the only
// rewards authority. A missing rewardTierId is a guest checkout with no reward
// → ok (no validation needed).
export async function validateRewardDiscount(opts: {
  phone?: string;
  email?: string;
  rewardTierId: string;
  claimedDiscount: number;
  subtotal: number;
  cartItems?: any[];
}): Promise<{ ok: boolean; error?: string; exactDiscount?: number; tier?: any; account?: any }> {
  const { phone, email, rewardTierId, claimedDiscount, subtotal, cartItems = [] } = opts;
  if (!rewardTierId) return { ok: true, exactDiscount: 0 };
  try {
    const program = await getLoyaltyProgram();
    if (!program?.id) return { ok: false, error: 'Star Rewards is unavailable right now. Please remove your reward and try again, or continue without it.' };
    if (program.status !== 'ACTIVE') return { ok: false, error: 'Star Rewards is not currently active.' };
    const tier = (program.reward_tiers || []).find((t: any) => t.id === rewardTierId);
    if (!tier) return { ok: false, error: 'This reward is no longer available. Please re-apply your reward or continue without it.' };
    // Resolve the tier's live Square pricing rule, then price it against the
    // actual cart: order scope comes off the subtotal, item scope off the
    // cheapest qualifying line (capped at the subtotal).
    const tierDiscounts = await getRewardTierDiscounts(program).catch((e: Error) => {
      console.error('validateRewardDiscount tier resolution failed:', e.message);
      return new Map<string, ResolvedTierDiscount>();
    });
    const resolved = tierDiscounts.get(tier.id) || null;
    if (!resolved) return { ok: false, error: 'This reward can only be redeemed in store.' };
    const exact = tierDiscountForCart(resolved, Number(subtotal) || 0, cartItems);
    if (exact == null) {
      return {
        ok: false,
        error: resolved.scope === 'ITEM'
          ? 'Add a qualifying item to your order to use this reward, or remove the reward and check out.'
          : 'This reward can only be redeemed in store.',
      };
    }
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

export async function grantLoyaltyPointsByPhone({
  phone,
  points,
  reason,
  idempotencyKey,
}: {
  phone: string;
  points: number;
  reason: string;
  idempotencyKey: string;
}): Promise<{ balance: number; accountId: string } | null> {
  const e164 = toE164Phone(phone);
  if (!e164) return null;
  const account = await searchLoyaltyAccountByPhone(e164);
  if (!account) return null;
  const updated = await adjustLoyaltyPoints({ accountId: account.id, points, reason, idempotencyKey });
  return { balance: updated?.balance ?? (account.balance || 0) + points, accountId: account.id };
}