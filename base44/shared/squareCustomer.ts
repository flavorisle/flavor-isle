const SQUARE_API = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2026-09-16';
// Square's hard limit on BulkRetrieveCustomers is 100 ids per request.
const MAX_IDS_PER_REQUEST = 100;

// Build several normalized variants of a phone number so Square's exact-match
// customer search is more likely to hit regardless of how the POS stored it.
function phoneVariants(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  const variants = new Set();
  if (raw) variants.add(raw);
  if (digits) {
    variants.add(digits);
    if (digits.length >= 10) variants.add(digits.slice(-10));
    if (digits.length === 10) variants.add('+1' + digits);
    if (digits.length === 11 && digits.startsWith('1')) variants.add('+' + digits);
    if (digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))) {
      const local = digits.slice(-10);
      variants.add(`(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`);
      variants.add(`${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6)}`);
    }
  }
  return [...variants];
}

// Look up a Square customer by phone number. Returns { id, name, email } or null.
export async function lookupCustomerByPhone(base44, phone) {
  if (!phone) return null;
  const connection = await base44.asServiceRole.connectors.getConnection('square');
  const accessToken = connection?.accessToken;
  if (!accessToken) return null;

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Square-Version': SQUARE_VERSION,
  };

  for (const variant of phoneVariants(phone)) {
    try {
      const res = await fetch(`${SQUARE_API}/customers/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: { filter: { phone_number: { exact: variant } } },
          limit: 1,
        }),
      });
      const data = await res.json();
      const c = data?.customers?.[0];
      if (c) {
        const name = [c.given_name, c.family_name].filter(Boolean).join(' ').trim() || c.company_name || '';
        return { id: c.id, name, email: c.email_address || '' };
      }
    } catch (e) {
      // try the next variant
    }
  }
  return null;
}

// Normalize any phone string to digits-only for reliable matching across
// systems (Square, CustomerProfile, Order).
export function normalizePhone(raw) {
  return (raw || '').replace(/\D/g, '');
}

// Square rejects the connector token on customer reads when the connection's
// scopes don't cover them, and says so with one of these.
function isAuthFailure(status, data) {
  if (status === 401 || status === 403) return true;
  return (data?.errors || []).some((e) =>
    e?.code === 'INSUFFICIENT_SCOPES' || e?.code === 'ACCESS_TOKEN_ERROR'
  );
}

// Split ids into Square-sized requests.
export function chunkIds(ids, size = MAX_IDS_PER_REQUEST) {
  const chunks = [];
  for (let i = 0; i < ids.length; i += size) chunks.push(ids.slice(i, i + size));
  return chunks;
}

async function retrieveChunk(token, chunk) {
  const res = await fetch(`${SQUARE_API}/customers/bulk-retrieve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Square-Version': SQUARE_VERSION,
    },
    body: JSON.stringify({ customer_ids: chunk }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => null);
  return { res, data };
}

// Batch-fetch Square customers by ID. Returns { map, error } where map is keyed
// by customer id of { id, name, email, phone } and error is the first failure
// text (or null). POS-managed records Square declines to return are simply
// absent from the map — that is not an error.
export async function lookupCustomersByIdsDetailed(base44, customerIds) {
  const ids = [...new Set((customerIds || []).filter(Boolean))];
  const map = new Map();
  if (!ids.length) return { map, error: null };

  const connection = await base44.asServiceRole.connectors.getConnection('square');
  const connectorToken = connection?.accessToken || '';
  const privateToken = Deno.env.get('SQUARE_ACCESS_TOKEN') || '';
  let token = connectorToken || privateToken;
  if (!token) return { map, error: 'no Square access token available' };

  let firstError = null;

  for (const chunk of chunkIds(ids)) {
    try {
      let { res, data } = await retrieveChunk(token, chunk);
      // The connector token can't read customers on this connection; the
      // private token can, so retry this chunk once and remember which works.
      if (!res.ok && isAuthFailure(res.status, data) && privateToken && token !== privateToken) {
        token = privateToken;
        ({ res, data } = await retrieveChunk(token, chunk));
      }
      if (!res.ok) {
        const text = `CustomerBulkRetrieve ${res.status}: ${JSON.stringify(data?.errors || data)}`;
        console.error('Square customer bulk-retrieve failed:', text);
        if (!firstError) firstError = text;
        continue;
      }
      for (const id of chunk) {
        const c = data?.responses?.[id]?.customer;
        if (!c) continue;
        const name = [c.given_name, c.family_name].filter(Boolean).join(' ').trim() || c.company_name || '';
        map.set(id, { id: c.id, name, email: c.email_address || '', phone: c.phone_number || '' });
      }
    } catch (e) {
      const text = `CustomerBulkRetrieve failed: ${(e as Error).message}`;
      console.error('Square customer bulk-retrieve error:', text);
      if (!firstError) firstError = text;
    }
  }

  return { map, error: firstError };
}

// Thin wrapper kept for existing callers: just the resolved customers.
export async function lookupCustomersByIds(base44, customerIds) {
  const { map } = await lookupCustomersByIdsDetailed(base44, customerIds);
  return map;
}