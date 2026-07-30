// Square Loyalty API helpers — backed by SQUARE_ACCESS_TOKEN (a private Square
// access token with LOYALTY_READ/LOYALTY_WRITE) instead of the shared Square
// connector, whose scopes don't include loyalty. Used to unify the online
// "Flavor Isle Star Rewards" with the in-store Square loyalty program.

const SQUARE_API = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2024-01-18';

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

export async function createLoyaltyAccount({
  programId,
  customerId,
  phone,
}: {
  programId: string;
  customerId: string;
  phone?: string | null;
}): Promise<any> {
  const loyalty_account: any = { loyalty_program_id: programId, customer_id: customerId };
  const e164 = toE164Phone(phone);
  if (e164) loyalty_account.mapping = { type: 'PHONE', id: e164, value: e164 };
  const res = await fetch(`${SQUARE_API}/loyalty/accounts`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ loyalty_account, idempotency_key: crypto.randomUUID() }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`CreateLoyaltyAccount failed: ${JSON.stringify(data?.errors || data)}`);
  return data?.loyalty_account;
}

export async function accumulateLoyaltyPoints({
  accountId,
  programId,
  orderId,
}: {
  accountId: string;
  programId: string;
  orderId: string;
}): Promise<any | null> {
  const res = await fetch(`${SQUARE_API}/loyalty/accounts/${accountId}/accumulate`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      accumulate_points: { loyalty_program_id: programId, order_id: orderId },
      idempotency_key: crypto.randomUUID(),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`AccumulateLoyaltyPoints failed: ${JSON.stringify(data?.errors || data)}`);
  return data?.loyalty_account || null;
}

export function describeRewardTier(tier: any): string {
  const def = tier?.definition || {};
  if (def.discount_type === 'FIXED_AMOUNT') {
    const cents = def.fixed_discount_money?.amount || 0;
    return `$${Math.round(cents / 100)} off`;
  }
  if (def.discount_type === 'FIXED_PERCENTAGE') {
    return `${def.percentage_discount || 0}% off`;
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
// online order is tendered.
export async function accrueForOrder({
  squareOrderId,
  email,
  phone,
}: {
  squareOrderId: string;
  email: string;
  phone?: string;
}): Promise<void> {
  const program = await getLoyaltyProgram();
  if (!program?.id) throw new Error('Square loyalty program not found');
  if (program.status === 'INACTIVE') throw new Error('Square loyalty program is not active');

  const customerId = await searchSquareCustomerIdByEmail(email);
  if (!customerId) throw new Error('No Square customer found for loyalty accrual');

  let account = await findLoyaltyAccountByCustomer(customerId);
  if (!account) {
    account = await createLoyaltyAccount({ programId: program.id, customerId, phone });
  }
  await accumulateLoyaltyPoints({ accountId: account.id, programId: program.id, orderId: squareOrderId });
}

// Build the status payload shown on the Account rewards screen. Finds (or
// creates, when a phone number is available) the buyer's loyalty account and
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
    });
  });

  if (program.status !== 'ACTIVE') return result;

  const customerId = await searchSquareCustomerIdByEmail(email);
  if (!customerId) {
    result.needsPhone = !toE164Phone(phone);
    return result;
  }

  let account = await findLoyaltyAccountByCustomer(customerId);
  if (!account) {
    const e164 = toE164Phone(phone);
    if (!e164) {
      result.needsPhone = true;
      return result;
    }
    try {
      account = await createLoyaltyAccount({ programId: program.id, customerId, phone: e164 });
    } catch (e) {
      // If we can't create (e.g. conflict), surface needsPhone so the UI nudges.
      console.error('Loyalty account create failed:', (e as Error).message);
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